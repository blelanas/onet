import { randomBytes } from "crypto";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import { requirePermission } from "@api/lib/auth/guards";
import { hashPassword, isStrongPassword } from "@api/lib/auth/password";
import { createSession, hashToken } from "@api/lib/auth/session";
import { ActionError, formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { getLocale, getTranslations } from "@api/lib/i18n";
import { notifyRoles, notifyUsers } from "@api/lib/services/notifications";
import { DEFAULT_LOCALE, OCCUPATIONS, SIGNUP_ROLE_KEYS, parseFormDate, type SignupRole } from "@onet/shared";
import { nextMembershipNumber } from "../members/actions";
import { splitName } from "../joinRequests/actions";
import { MEMBER_TYPE_FOR_ROLE, SIGNUP_MAX_AGE, SIGNUP_MIN_AGE, ageOn, invitationState, isSignupRole, normalizePhone, parsePeopleList } from "./lib";

const APPROVERS = ["super_admin", "admin"];
const DAY = 86400_000;

/** Sign-up name parts are capped at 40 characters each; the account name ("First Last") at 80. */
const NAME_PART_MAX = 40;
const NAME_MAX = 80;

/** What a sign-up tells about the person, copied onto their Member record. */
type Profile = {
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  occupation: string | null;
  occupationDetail: string | null;
  email: string;
  phone: string | null;
};

/** Profile of an account created before sign-ups asked for these details (name only). */
function profileFromAccount(u: { name: string; email: string; phone: string | null }): Profile {
  const { firstName, lastName } = splitName(u.name);
  return { firstName: firstName.slice(0, NAME_MAX), lastName: lastName.slice(0, NAME_MAX), dateOfBirth: null, occupation: null, occupationDetail: null, email: u.email, phone: u.phone };
}

/**
 * The one existing Member of that type without an account whose e-mail is the same (any case), or
 * null when there is none or more than one (ambiguous).
 */
async function unlinkedMatch(tx: Prisma.TransactionClient, type: string, email: string) {
  const matches = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Member" WHERE "type" = ${type} AND "userId" IS NULL AND "email" IS NOT NULL AND lower("email") = lower(${email}) LIMIT 2`;
  return matches.length === 1 ? matches[0].id : null;
}

/** Links an existing record to the account and fills its empty fields from the sign-up (never overwrites). */
async function linkExisting(tx: Prisma.TransactionClient, memberId: string, userId: string, p: Profile) {
  const { count } = await tx.member.updateMany({ where: { id: memberId, userId: null }, data: { userId } });
  if (!count) return false;
  const m = await tx.member.findUniqueOrThrow({ where: { id: memberId }, select: { dateOfBirth: true, occupation: true, occupationDetail: true, phone: true, email: true } });
  const fill: Prisma.MemberUpdateInput = {};
  if (!m.dateOfBirth && p.dateOfBirth) fill.dateOfBirth = p.dateOfBirth;
  if (!m.occupation && p.occupation) fill.occupation = p.occupation;
  if (!m.occupationDetail && p.occupationDetail) fill.occupationDetail = p.occupationDetail;
  if (!m.phone?.trim() && p.phone) fill.phone = p.phone;
  if (!m.email?.trim() && p.email) fill.email = p.email;
  if (Object.keys(fill).length) await tx.member.update({ where: { id: memberId }, data: fill });
  return true;
}

function memberData(p: Profile, type: string) {
  return {
    type,
    firstName: p.firstName,
    lastName: p.lastName,
    dateOfBirth: p.dateOfBirth,
    occupation: p.occupation,
    occupationDetail: p.occupationDetail,
    email: p.email,
    phone: p.phone,
  };
}

/**
 * Gives an ACTIVE login (MONITOR or MEMBER) its Member record, inside the caller's transaction. When
 * exactly one existing Member of that type without an account has the same e-mail (any case), that
 * record is linked (its empty fields filled from the sign-up) instead of creating a duplicate.
 */
async function createLinkedMember(tx: Prisma.TransactionClient, userId: string, role: SignupRole, p: Profile) {
  const type = MEMBER_TYPE_FOR_ROLE[role];
  const match = await unlinkedMatch(tx, type, p.email);
  if (match && (await linkExisting(tx, match, userId, p))) return { id: match };
  return tx.member.create({
    data: { ...memberData(p, type), userId, membershipNumber: await nextMembershipNumber(tx), membershipStatus: "ACTIVE" },
    select: { id: true },
  });
}

/**
 * A PENDING sign-up keeps what it told about itself on a Member record of its own, with membership
 * status PENDING: it is never linked to an existing record before an approver has seen it (the e-mail
 * is not verified). Approval activates it (or merges it into the existing record), rejection removes it.
 */
async function createPendingMember(tx: Prisma.TransactionClient, userId: string, role: SignupRole, p: Profile) {
  return tx.member.create({
    data: { ...memberData(p, MEMBER_TYPE_FOR_ROLE[role]), userId, membershipNumber: await nextMembershipNumber(tx), membershipStatus: "PENDING" },
    select: { id: true },
  });
}

/** On approval: the account's Member record, activated (see createPendingMember). */
async function activateMember(
  tx: Prisma.TransactionClient,
  u: { id: string; name: string; email: string; phone: string | null; member: (Omit<Profile, "email" | "phone"> & { id: string; membershipStatus: string; email: string | null; phone: string | null }) | null },
  role: SignupRole,
) {
  const m = u.member;
  // Accounts that signed up before sign-ups recorded a Member: same as an ACTIVE sign-up.
  if (!m) return (await createLinkedMember(tx, u.id, role, profileFromAccount(u))).id;
  if (m.membershipStatus !== "PENDING") return m.id;
  const type = MEMBER_TYPE_FOR_ROLE[role];
  const profile: Profile = { ...m, email: u.email, phone: m.phone ?? u.phone };
  const match = await unlinkedMatch(tx, type, u.email);
  if (match) {
    // The organisation already knows this person: keep its record, completed with the sign-up's answers.
    await tx.member.delete({ where: { id: m.id } });
    if (!(await linkExisting(tx, match, u.id, profile))) throw new ActionError("errors.unexpected");
    return match;
  }
  await tx.member.update({ where: { id: m.id }, data: { type, membershipStatus: "ACTIVE", membershipDate: new Date() } });
  return m.id;
}

// ─── Public sign-up ─────────────────────────────────────────────────────────

/**
 * Consumes one use of an invitation, atomically: two sign-ups racing for the last place, or a
 * revocation / expiry in between, can't let an extra sign-up through. Returns false when nothing was
 * taken. Dates are stored as ISO-8601 UTC text and bound the same way, so the comparison is exact.
 */
export async function takeInvitationPlace(tx: Prisma.TransactionClient, id: string, now = new Date()) {
  const taken = await tx.$executeRaw`UPDATE "Invitation" SET "uses" = "uses" + 1 WHERE "id" = ${id} AND "revokedAt" IS NULL AND "expiresAt" > ${now} AND "uses" < "maxUses"`;
  return taken > 0;
}

const optToken = z.preprocess((v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined), z.string().max(200).optional());

/** Date of birth (<input type="date">), giving an age between SIGNUP_MIN_AGE and SIGNUP_MAX_AGE today. */
const zBirthDate = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v instanceof Date ? v : parseFormDate(String(v).trim().slice(0, 10))),
  z
    .date({ error: (iss) => (iss.input === undefined ? "errors.required" : "errors.birthDate") })
    .refine((d) => ageOn(d) >= SIGNUP_MIN_AGE, "errors.ageMin")
    .refine((d) => ageOn(d) <= SIGNUP_MAX_AGE, "errors.ageMax"),
);

/** Required text: missing or blank both give "errors.required". */
const reqText = (max: number) => z.string({ error: "errors.required" }).trim().min(1, "errors.required").max(max);

const signupSchema = z.object({
  firstName: reqText(NAME_PART_MAX),
  lastName: reqText(NAME_PART_MAX),
  dateOfBirth: zBirthDate,
  email: z.string().trim().toLowerCase().max(160).email("errors.email"),
  phone: z
    .string()
    .trim()
    .min(1, "errors.required")
    .max(30)
    .regex(/^\+?[0-9 ().-]{8,}$/, "errors.phone"),
  // Student / worker / other, and the school & field of study or the job.
  occupation: z.enum(OCCUPATIONS, { error: "errors.required" }),
  occupationDetail: reqText(120),
  password: z.string().min(1, "errors.required").max(200),
  invite: optToken,
});

/**
 * Self sign-up (members = monitors / animators). Role decision (staff roles are never reachable from here):
 *  1. e-mail or phone on the pre-approved list → ACTIVE with that role (entry marked used);
 *  2. a valid invitation link → PENDING, requestedRole = the invitation's role (one use consumed);
 *  3. otherwise → PENDING, requestedRole = member.
 * ACTIVE accounts get their linked Member right away; PENDING ones a PENDING Member, activated on approval.
 * Signs the new user in: same response shape as /auth/login.
 */
export async function signup(input: unknown) {
  return runAction(signupSchema, formToObject((input ?? {}) as Record<string, unknown>), async (d) => {
    if (!isStrongPassword(d.password)) throw new ActionError("errors.weakPassword");
    const phoneKey = normalizePhone(d.phone);
    if (!phoneKey) throw new ActionError("errors.phone");
    const passwordHash = await hashPassword(d.password);
    const locale = await getLocale(); // the language the visitor signed up in
    const profile: Profile = {
      firstName: d.firstName,
      lastName: d.lastName,
      dateOfBirth: d.dateOfBirth,
      occupation: d.occupation,
      occupationDetail: d.occupationDetail,
      email: d.email,
      phone: d.phone,
    };

    const result = await db.$transaction(async (tx) => {
      if (await tx.user.findUnique({ where: { email: d.email }, select: { id: true } })) throw new ActionError("errors.signupEmailTaken");

      const entry = await tx.preapprovedPerson.findFirst({
        where: { usedById: null, OR: [{ email: d.email }, { phone: phoneKey }] },
        orderBy: { createdAt: "asc" },
      });
      let status: "ACTIVE" | "PENDING" = "PENDING";
      let role: SignupRole = "member";
      let invitation: { id: string; label: string | null } | null = null;

      if (entry && isSignupRole(entry.role)) {
        status = "ACTIVE";
        role = entry.role;
      } else if (d.invite) {
        const inv = await tx.invitation.findUnique({ where: { tokenHash: hashToken(d.invite) } });
        if (!inv || !isSignupRole(inv.role)) throw new ActionError("errors.inviteInvalid");
        const state = invitationState(inv);
        if (state !== "valid") throw new ActionError(`errors.invite${state[0].toUpperCase()}${state.slice(1)}`);
        // Atomic: two sign-ups racing for the last place can't both get it.
        if (!(await takeInvitationPlace(tx, inv.id))) throw new ActionError("errors.inviteFull");
        role = inv.role;
        invitation = { id: inv.id, label: inv.label };
      }

      const roleRow = status === "ACTIVE" ? await tx.role.findUnique({ where: { key: role }, select: { id: true } }) : null;
      if (status === "ACTIVE" && !roleRow) throw new ActionError("errors.unexpected");
      const user = await tx.user.create({
        data: {
          name: `${d.firstName} ${d.lastName}`.slice(0, NAME_MAX),
          email: d.email,
          phone: d.phone,
          passwordHash,
          locale,
          status,
          requestedRole: status === "PENDING" ? role : null,
          invitationId: invitation?.id ?? null,
          roles: roleRow ? { create: [{ roleId: roleRow.id }] } : undefined,
        },
      });
      if (status === "ACTIVE") await createLinkedMember(tx, user.id, role, profile);
      else await createPendingMember(tx, user.id, role, profile);
      if (entry && status === "ACTIVE") {
        const { count } = await tx.preapprovedPerson.updateMany({ where: { id: entry.id, usedById: null }, data: { usedById: user.id, usedAt: new Date() } });
        if (!count) throw new ActionError("errors.unexpected");
      }
      return { user, status, role, invitation, preapprovedId: entry && status === "ACTIVE" ? entry.id : null };
    });

    const { user, status, role, invitation, preapprovedId } = result;
    await audit(user.id, "signup", "User", user.id, { status, role, invitationId: invitation?.id ?? null, preapprovedId });
    if (status === "PENDING") {
      // The account exists: a notification failure must not turn the sign-up into an error.
      try {
        const t = await getTranslations({ locale: DEFAULT_LOCALE, namespace: "approvals.notify" });
        const tr = await getTranslations({ locale: DEFAULT_LOCALE, namespace: "common.roles" });
        await notifyRoles(APPROVERS, {
          type: "SYSTEM",
          title: t("pendingTitle", { name: user.name }),
          body: invitation?.label ? t("pendingBodyLabel", { role: tr(role), label: invitation.label }) : t("pendingBody", { role: tr(role) }),
          link: "/dashboard/approvals",
        });
      } catch (e) {
        console.error("[signup] approver notification failed for user", user.id, e);
      }
    }
    const session = await createSession(user.id);
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return { token: session.token, expiresAt: session.expiresAt, locale: user.locale, status };
  });
}

// ─── Pending approvals ──────────────────────────────────────────────────────

const idsSchema = z.object({ ids: z.array(zs.id).min(1, "errors.required").max(500) });

/** Approve PENDING sign-ups: grant the requested role, mark APPROVED (status ACTIVE), activate the Member. */
export async function approveUsers(input: unknown) {
  return runAction(idsSchema, input, async ({ ids }) => {
    const actor = await requirePermission("users.approve");
    const roles = Object.fromEntries((await db.role.findMany({ where: { key: { in: [...SIGNUP_ROLE_KEYS] } }, select: { id: true, key: true } })).map((r) => [r.key, r.id]));
    const approved = await db.$transaction(async (tx) => {
      const users = await tx.user.findMany({
        where: { id: { in: [...new Set(ids)] }, status: "PENDING" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          locale: true,
          requestedRole: true,
          member: { select: { id: true, membershipStatus: true, firstName: true, lastName: true, dateOfBirth: true, occupation: true, occupationDetail: true, email: true, phone: true } },
        },
      });
      const done: { id: string; role: string; memberId: string; locale: string }[] = [];
      const now = new Date();
      for (const u of users) {
        // Only monitor / member can ever be requested; anything else falls back to member.
        const role = isSignupRole(u.requestedRole) ? u.requestedRole : "member";
        if (!roles[role]) throw new ActionError("errors.unexpected");
        const { count } = await tx.user.updateMany({ where: { id: u.id, status: "PENDING" }, data: { status: "ACTIVE", approvedById: actor.id, approvedAt: now } });
        if (!count) continue;
        await tx.userRole.upsert({ where: { userId_roleId: { userId: u.id, roleId: roles[role] } }, create: { userId: u.id, roleId: roles[role] }, update: {} });
        const memberId = await activateMember(tx, u, role);
        done.push({ id: u.id, role, memberId, locale: u.locale });
      }
      return done;
    });
    for (const u of approved) await audit(actor.id, "approve", "User", u.id, { role: u.role, memberId: u.memberId });
    for (const u of approved) {
      try {
        const t = await getTranslations({ locale: u.locale, namespace: "approvals.notify" });
        await notifyUsers([u.id], { type: "SYSTEM", title: t("approvedTitle"), body: t("approvedBody"), link: "/dashboard" });
      } catch (e) {
        console.error("[approvals] notification failed for user", u.id, e);
      }
    }
    return { count: approved.length };
  });
}

/**
 * Reject PENDING sign-ups: the account can no longer sign in (sessions revoked) and the PENDING Member
 * holding its answers is removed (or, if something already points to it, unlinked and made inactive).
 */
export async function rejectUsers(input: unknown) {
  return runAction(idsSchema, input, async ({ ids }) => {
    const actor = await requirePermission("users.approve");
    const targets = (await db.user.findMany({ where: { id: { in: [...new Set(ids)] }, status: "PENDING" }, select: { id: true } })).map((u) => u.id);
    if (!targets.length) return { count: 0 };
    const [{ count }] = await db.$transaction([
      db.user.updateMany({ where: { id: { in: targets }, status: "PENDING" }, data: { status: "REJECTED", approvedById: actor.id, approvedAt: new Date() } }),
      db.session.deleteMany({ where: { userId: { in: targets } } }),
    ]);
    const pending = { userId: { in: targets }, membershipStatus: "PENDING" };
    try {
      await db.member.deleteMany({ where: pending });
    } catch {
      await db.member.updateMany({ where: pending, data: { userId: null, membershipStatus: "INACTIVE" } });
    }
    for (const id of targets) await audit(actor.id, "reject", "User", id);
    return { count };
  });
}

// ─── Invitations ────────────────────────────────────────────────────────────

const invitationSchema = z.object({
  role: z.enum(SIGNUP_ROLE_KEYS, { error: "errors.validation" }),
  label: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(80).optional()),
  expiresAt: zs.optDate,
  maxUses: z.preprocess((v) => (v === "" || v == null ? 50 : Number(v)), z.number({ error: "errors.validation" }).int("errors.validation").min(1, "errors.validation").max(500, "errors.maxUses")),
});

/** Creates an invitation link. The raw token is returned once; only its SHA-256 is stored. */
export async function createInvitation(input: unknown) {
  return runAction(invitationSchema, formToObject((input ?? {}) as Record<string, unknown>), async (d) => {
    const actor = await requirePermission("users.approve");
    const expiresAt = d.expiresAt ?? new Date(Date.now() + 7 * DAY);
    if (expiresAt.getTime() <= Date.now() || expiresAt.getTime() > Date.now() + 366 * DAY) throw new ActionError("errors.inviteExpiry");
    const token = randomBytes(24).toString("base64url");
    const inv = await db.invitation.create({ data: { tokenHash: hashToken(token), role: d.role, label: d.label ?? null, expiresAt, maxUses: d.maxUses, createdById: actor.id } });
    await audit(actor.id, "create", "Invitation", inv.id, { role: d.role, label: d.label ?? null, expiresAt, maxUses: d.maxUses });
    return { id: inv.id, token, role: inv.role, label: inv.label, expiresAt: inv.expiresAt, maxUses: inv.maxUses };
  });
}

export async function revokeInvitation(id: string) {
  return runAction(zs.id, id, async (invId) => {
    const actor = await requirePermission("users.approve");
    const { count } = await db.invitation.updateMany({ where: { id: invId, revokedAt: null }, data: { revokedAt: new Date() } });
    if (!count) throw new ActionError("errors.notFound");
    await audit(actor.id, "revoke", "Invitation", invId);
  });
}

// ─── Pre-approved list ──────────────────────────────────────────────────────

const importSchema = z.object({
  role: z.enum(SIGNUP_ROLE_KEYS, { error: "errors.validation" }),
  text: z.string().trim().min(1, "errors.required").max(200_000, "errors.listTooLong"),
});

/** Imports `Name; email; phone` lines. Returns added / duplicate counts and invalid line numbers. */
export async function importPreapproved(input: unknown) {
  return runAction(importSchema, formToObject((input ?? {}) as Record<string, unknown>), async (d) => {
    const actor = await requirePermission("users.approve");
    const { people, invalid } = parsePeopleList(d.text);
    if (people.length + invalid.length > 2000) throw new ActionError("errors.listTooLong");
    const emails = people.map((p) => p.email).filter((x): x is string => !!x);
    const phones = people.map((p) => p.phone).filter((x): x is string => !!x);
    const [waiting, accounts] = await Promise.all([
      db.preapprovedPerson.findMany({ where: { usedById: null, OR: [{ email: { in: emails } }, { phone: { in: phones } }] }, select: { email: true, phone: true } }),
      db.user.findMany({ where: { email: { in: emails } }, select: { email: true } }),
    ]);
    const seenEmail = new Set(waiting.map((w) => w.email).filter(Boolean));
    const seenPhone = new Set(waiting.map((w) => w.phone).filter(Boolean));
    const hasAccount = new Set(accounts.map((a) => a.email));
    const toAdd: typeof people = [];
    const duplicates: number[] = [];
    const existing: number[] = [];
    for (const p of people) {
      if (p.email && hasAccount.has(p.email)) existing.push(p.line);
      else if ((p.email && seenEmail.has(p.email)) || (p.phone && seenPhone.has(p.phone))) duplicates.push(p.line);
      else {
        toAdd.push(p);
        if (p.email) seenEmail.add(p.email);
        if (p.phone) seenPhone.add(p.phone);
      }
    }
    if (toAdd.length) await db.preapprovedPerson.createMany({ data: toAdd.map((p) => ({ name: p.name, email: p.email, phone: p.phone, role: d.role, createdById: actor.id })) });
    const summary = { added: toAdd.length, duplicates: duplicates.length, duplicateLines: duplicates, existingLines: existing, invalid };
    await audit(actor.id, "import", "PreapprovedPerson", null, { role: d.role, added: toAdd.length, duplicates: duplicates.length, existing: existing.length, invalid: invalid.length });
    return summary;
  });
}

export async function deletePreapproved(id: string) {
  return runAction(zs.id, id, async (entryId) => {
    const actor = await requirePermission("users.approve");
    // Activated entries stay as a record of who got which role.
    const { count } = await db.preapprovedPerson.deleteMany({ where: { id: entryId, usedById: null } });
    if (!count) throw new ActionError("errors.notFound");
    await audit(actor.id, "delete", "PreapprovedPerson", entryId);
  });
}

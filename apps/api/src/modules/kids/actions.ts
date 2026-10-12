import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import { AuthError, requirePermission } from "@api/lib/auth/guards";
import type { CurrentUser } from "@api/lib/auth/session";
import { ActionError, formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { GENDERS, GUARDIAN_RELATIONS } from "@api/lib/constants";
import { nextMembershipNumber } from "@api/modules/members/actions";
import { assertCanManageKids, canEditKid } from "@api/modules/events/access";
import { normalizePhone } from "@api/modules/signup/lib";

const optEnum = <T extends readonly [string, ...string[]]>(values: T) => z.preprocess((v) => (v === "" || v == null ? undefined : v), z.enum(values).optional());
/** A real phone number (8–15 digits, no letters: see normalizePhone), kept as typed. */
const phone = z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().max(40).refine((v) => normalizePhone(v) !== null, "errors.phone"));

/** "Ali Ben Salah" → { firstName: "Ali", lastName: "Ben Salah" }; a single word takes the kid's last name. */
export function splitName(full: string, fallbackLast: string) {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? { firstName: parts[0], lastName: parts.slice(1).join(" ") } : { firstName: parts[0], lastName: fallbackLast };
}

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/**
 * An existing parent contact (without login) with the same phone number — siblings share their parents.
 * Contacts that have an account are never reused: linking a kid would give that account access to it.
 */
async function findParentByPhone(tx: Prisma.TransactionClient, phoneNumber: string) {
  const key = digits(phoneNumber).slice(-8);
  if (key.length < 6) return null;
  const candidates = await tx.member.findMany({ where: { type: "PARENT", userId: null, phone: { contains: key.slice(-2) } }, select: { id: true, phone: true } });
  return candidates.find((c) => digits(c.phone).slice(-8) === key) ?? null;
}

async function upsertGuardian(tx: Prisma.TransactionClient, childId: string, child: { lastName: string }, parentName: string, parentPhone: string, relation: string) {
  const existing = await findParentByPhone(tx, parentPhone);
  const parentId =
    existing?.id ??
    (
      await tx.member.create({
        data: { type: "PARENT", ...splitName(parentName, child.lastName), phone: parentPhone, membershipNumber: await nextMembershipNumber(tx) },
      })
    ).id;
  await tx.guardianship.updateMany({ where: { childId, isPrimary: true, parentId: { not: parentId } }, data: { isPrimary: false } });
  await tx.guardianship.upsert({
    where: { parentId_childId: { parentId, childId } },
    create: { parentId, childId, relation, isPrimary: true },
    update: { relation, isPrimary: true },
  });
  return parentId;
}

const DAY = 86400_000;

/** A CHILD member with the same names and birth date (±1 day: dates may have been typed in another time zone). */
async function findSameKid(tx: Prisma.TransactionClient, firstName: string, lastName: string, dateOfBirth: Date) {
  const rows = await tx.member.findMany({ where: { type: "CHILD", firstName, lastName, dateOfBirth: { gte: new Date(+dateOfBirth - DAY), lte: new Date(+dateOfBirth + DAY) } }, select: { id: true } });
  return rows[0] ?? null;
}

async function editionTeamOrNull(eventId: string, teamId: string | undefined) {
  if (!teamId) return null;
  const team = await db.eventTeam.findUnique({ where: { id: teamId }, select: { id: true, eventId: true } });
  if (!team || team.eventId !== eventId) throw new ActionError("errors.validation");
  return team.id;
}

const addKidSchema = z
  .object({
    eventId: zs.id,
    memberId: zs.optId,
    firstName: zs.optStr,
    lastName: zs.optStr,
    dateOfBirth: zs.optDate,
    gender: optEnum(GENDERS),
    photoUrl: zs.optStr,
    medicalNotes: zs.optStr,
    parentName: zs.optStr,
    parentPhone: z.preprocess((v) => (v === "" || v == null ? undefined : v), phone.optional()),
    parentRelation: optEnum(GUARDIAN_RELATIONS),
    teamId: zs.optId,
  })
  .superRefine((d, ctx) => {
    if (d.memberId) return;
    for (const k of ["firstName", "lastName", "dateOfBirth", "parentName", "parentPhone"] as const) if (!d[k]) ctx.addIssue({ code: "custom", path: [k], message: "errors.required" });
    if (d.firstName && d.firstName.length > 80) ctx.addIssue({ code: "custom", path: ["firstName"], message: "errors.validation" });
    if (d.lastName && d.lastName.length > 80) ctx.addIssue({ code: "custom", path: ["lastName"], message: "errors.validation" });
    if (d.dateOfBirth && d.dateOfBirth > new Date()) ctx.addIssue({ code: "custom", path: ["dateOfBirth"], message: "errors.validation" });
  });

/**
 * POST /events/:id/kids — adds a kid to an edition (admins and the edition's leaders): an existing kid
 * ({memberId}) or a new one (CHILD member + parent contact without login + primary guardianship), then
 * a CONFIRMED registration without invoice. The duplicate checks and the writes run in one write
 * transaction (libSQL serialises writers), so two identical requests can't both create the kid. A kid can't
 * be added twice (errors.alreadyRegistered); a new kid identical to an existing one (names + birth date) is
 * refused with errors.kidExists so the existing record is used instead. Re-adding a kid whose registration
 * was cancelled restores it; an invoice cancelled with it is detached (no link to a dead invoice).
 */
export async function addKid(fd: FormData | Record<string, unknown>) {
  return runAction(addKidSchema, formToObject(fd), async (d) => {
    const user = await requirePermission("events.read");
    const event = await db.event.findUnique({ where: { id: d.eventId }, select: { id: true, title: true } });
    if (!event) throw new ActionError("errors.notFound");
    await assertCanManageKids(user, event.id);
    const teamId = await editionTeamOrNull(event.id, d.teamId);

    const result = await db.$transaction(async (tx) => {
      let memberId = d.memberId;
      const registration = (kidId: string) =>
        tx.eventRegistration.findUnique({ where: { eventId_memberId: { eventId: event.id, memberId: kidId } }, select: { id: true, status: true, invoice: { select: { status: true } } } });
      let existing: Awaited<ReturnType<typeof registration>> = null;
      if (memberId) {
        const kid = await tx.member.findUnique({ where: { id: memberId }, select: { type: true } });
        if (kid?.type !== "CHILD") throw new ActionError("errors.validation");
        existing = await registration(memberId);
        if (existing && existing.status !== "CANCELLED") throw new ActionError("errors.alreadyRegistered");
      } else {
        const same = await findSameKid(tx, d.firstName!, d.lastName!, d.dateOfBirth!);
        if (same) {
          const reg = await registration(same.id);
          throw new ActionError(reg && reg.status !== "CANCELLED" ? "errors.alreadyRegistered" : "errors.kidExists");
        }
      }
      if (!memberId) {
        const kid = await tx.member.create({
          data: {
            type: "CHILD",
            firstName: d.firstName!,
            lastName: d.lastName!,
            dateOfBirth: d.dateOfBirth!,
            gender: d.gender ?? null,
            photoUrl: d.photoUrl ?? null,
            medicalNotes: d.medicalNotes ?? null,
            emergencyName: d.parentName!,
            emergencyPhone: d.parentPhone!,
            membershipNumber: await nextMembershipNumber(tx),
          },
        });
        memberId = kid.id;
        await upsertGuardian(tx, kid.id, kid, d.parentName!, d.parentPhone!, d.parentRelation ?? "PARENT");
      }
      const reg = existing
        ? await tx.eventRegistration.update({
            where: { id: existing.id },
            // A paid invoice stays attached (money to refund or keep); a cancelled one doesn't come back.
            data: { status: "CONFIRMED", teamId, registeredById: user.id, ...(existing.invoice?.status === "CANCELLED" ? { invoiceId: null } : {}) },
          })
        : await tx.eventRegistration.create({ data: { eventId: event.id, memberId: memberId!, status: "CONFIRMED", teamId, registeredById: user.id } });
      return { registrationId: reg.id, memberId: memberId! };
    });
    await audit(user.id, d.memberId ? "add_kid" : "create_kid", "EventRegistration", result.registrationId, { eventId: event.id, memberId: result.memberId, teamId });
    return result;
  });
}

async function editionRegistration(user: CurrentUser, eventId: string, registrationId: string) {
  await assertCanManageKids(user, eventId);
  const reg = await db.eventRegistration.findUnique({ where: { id: registrationId }, select: { id: true, eventId: true, memberId: true, invoiceId: true, invoice: { select: { status: true } }, member: { select: { type: true } } } });
  if (!reg || reg.eventId !== eventId || reg.member.type !== "CHILD") throw new ActionError("errors.notFound");
  return reg;
}

/** POST /events/:id/kids/:registrationId/team — {teamId|null}: assigns a kid to one of the edition's teams. */
export async function setKidTeam(fd: FormData | Record<string, unknown>) {
  return runAction(z.object({ eventId: zs.id, registrationId: zs.id, teamId: zs.optId }), formToObject(fd), async (d) => {
    const user = await requirePermission("events.read");
    const reg = await editionRegistration(user, d.eventId, d.registrationId);
    const teamId = await editionTeamOrNull(d.eventId, d.teamId);
    await db.eventRegistration.update({ where: { id: reg.id }, data: { teamId } });
    await audit(user.id, "assign_team", "EventRegistration", reg.id, { eventId: d.eventId, teamId });
    return { teamId };
  });
}

/** DELETE /events/:id/kids/:registrationId — removes a kid from an edition (refused when an invoice is attached). */
export async function removeKid(eventId: string, registrationId: string) {
  return runAction(z.object({ eventId: zs.id, registrationId: zs.id }), { eventId, registrationId }, async (d) => {
    const user = await requirePermission("events.read");
    const reg = await editionRegistration(user, d.eventId, d.registrationId);
    if (reg.invoiceId && reg.invoice && reg.invoice.status !== "CANCELLED") throw new ActionError("errors.inUse");
    await db.eventRegistration.delete({ where: { id: reg.id } });
    await audit(user.id, "remove_kid", "EventRegistration", reg.id, { eventId: d.eventId, memberId: reg.memberId });
  });
}

const updateKidSchema = z.object({
  id: zs.id,
  firstName: zs.reqStr(80),
  lastName: zs.reqStr(80),
  firstNameAr: zs.optStr,
  lastNameAr: zs.optStr,
  dateOfBirth: zs.optDate,
  gender: optEnum(GENDERS),
  photoUrl: zs.optStr,
  medicalNotes: zs.optStr,
  parentName: zs.optStr,
  parentPhone: z.preprocess((v) => (v === "" || v == null ? undefined : v), phone.optional()),
  parentRelation: optEnum(GUARDIAN_RELATIONS),
});

/**
 * POST /kids/:id — the kid card: photo, names, birth date, medical notes and the parent contact. Member
 * managers, admins, and the leaders of one of the kid's editions. A parent contact that has a login keeps
 * its own name / phone (the person manages them); only the relation is updated then.
 */
export async function updateKid(fd: FormData | Record<string, unknown>) {
  return runAction(updateKidSchema, formToObject(fd), async (d) => {
    const user = await requirePermission("events.read");
    const kid = await db.member.findUnique({ where: { id: d.id }, select: { id: true, type: true, lastName: true } });
    if (!kid || kid.type !== "CHILD") throw new ActionError("errors.notFound");
    if (!(await canEditKid(user, kid.id))) throw new AuthError("FORBIDDEN");
    if (d.dateOfBirth && d.dateOfBirth > new Date()) throw new ActionError("errors.validation");
    await db.$transaction(async (tx) => {
      await tx.member.update({
        where: { id: kid.id },
        data: {
          firstName: d.firstName,
          lastName: d.lastName,
          ...(d.firstNameAr !== undefined ? { firstNameAr: d.firstNameAr } : {}),
          ...(d.lastNameAr !== undefined ? { lastNameAr: d.lastNameAr } : {}),
          dateOfBirth: d.dateOfBirth ?? null,
          gender: d.gender ?? null,
          photoUrl: d.photoUrl ?? null,
          medicalNotes: d.medicalNotes ?? null,
        },
      });
      const link = await tx.guardianship.findFirst({
        where: { childId: kid.id },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: { parentId: true, relation: true, parent: { select: { userId: true, firstName: true, lastName: true } } },
      });
      if (link) {
        if (!link.parent.userId && (d.parentName || d.parentPhone)) {
          await tx.member.update({
            where: { id: link.parentId },
            data: { ...(d.parentName ? splitName(d.parentName, d.lastName) : {}), ...(d.parentPhone ? { phone: d.parentPhone } : {}) },
          });
          await tx.member.update({ where: { id: kid.id }, data: { emergencyName: d.parentName ?? `${link.parent.firstName} ${link.parent.lastName}`, ...(d.parentPhone ? { emergencyPhone: d.parentPhone } : {}) } });
        }
        if (d.parentRelation && d.parentRelation !== link.relation) {
          await tx.guardianship.update({ where: { parentId_childId: { parentId: link.parentId, childId: kid.id } }, data: { relation: d.parentRelation } });
        }
      } else if (d.parentName && d.parentPhone) {
        await upsertGuardian(tx, kid.id, { lastName: d.lastName }, d.parentName, d.parentPhone, d.parentRelation ?? "PARENT");
        await tx.member.update({ where: { id: kid.id }, data: { emergencyName: d.parentName, emergencyPhone: d.parentPhone } });
      } else if (d.parentName || d.parentPhone) throw new ActionError("errors.validation");
    });
    await audit(user.id, "update_kid", "Member", kid.id, { name: `${d.firstName} ${d.lastName}` });
    return { id: kid.id };
  });
}

"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { hashPassword, isStrongPassword } from "@/lib/auth/password";
import { ActionError, formToObject, runAction, zs } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { GENDERS, GUARDIAN_RELATIONS, MEMBER_TYPES, MEMBERSHIP_STATUSES } from "@/lib/constants";

const memberSchema = z.object({
  id: zs.optId,
  type: z.enum(MEMBER_TYPES),
  firstName: zs.reqStr(80),
  lastName: zs.reqStr(80),
  firstNameAr: zs.optStr,
  lastNameAr: zs.optStr,
  dateOfBirth: zs.optDate,
  gender: z.preprocess((v) => (v === "" ? undefined : v), z.enum(GENDERS).optional()),
  photoUrl: zs.optStr,
  phone: zs.optStr,
  email: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().toLowerCase().email("errors.email").optional()),
  address: zs.optStr,
  city: zs.optStr,
  emergencyName: zs.optStr,
  emergencyPhone: zs.optStr,
  membershipStatus: z.enum(MEMBERSHIP_STATUSES).default("ACTIVE"),
  membershipDate: zs.optDate,
  groupId: zs.optId,
  notes: zs.optStr,
  medicalNotes: zs.optStr,
  parentIds: z.array(z.string()).optional(),
  monitorGroupIds: z.array(z.string()).optional(),
});

async function nextMembershipNumber() {
  const last = await db.member.findFirst({ where: { membershipNumber: { startsWith: "ONT-" } }, orderBy: { membershipNumber: "desc" }, select: { membershipNumber: true } });
  const n = last ? Number(last.membershipNumber.slice(4)) + 1 : 1;
  return `ONT-${String(n).padStart(4, "0")}`;
}

export async function saveMember(fd: FormData) {
  return runAction(memberSchema, formToObject(fd), async (data) => {
    const user = await requirePermission("members.manage");
    const { id, parentIds, monitorGroupIds, ...fields } = data;
    const payload = {
      ...fields,
      groupId: fields.type === "CHILD" ? (fields.groupId ?? null) : null,
      firstNameAr: fields.firstNameAr ?? null,
      lastNameAr: fields.lastNameAr ?? null,
      dateOfBirth: fields.dateOfBirth ?? null,
      gender: fields.gender ?? null,
      photoUrl: fields.photoUrl ?? null,
      phone: fields.phone ?? null,
      email: fields.email ?? null,
      address: fields.address ?? null,
      emergencyName: fields.emergencyName ?? null,
      emergencyPhone: fields.emergencyPhone ?? null,
      notes: fields.notes ?? null,
      medicalNotes: fields.medicalNotes ?? null,
      membershipDate: fields.membershipDate ?? new Date(),
    };
    const member = await db.$transaction(async (tx) => {
      const m = id
        ? await tx.member.update({ where: { id }, data: payload })
        : await tx.member.create({ data: { ...payload, membershipNumber: await nextMembershipNumber() } });
      // An empty multi-select submits nothing: treat a missing list as "no links".
      if (fields.type === "CHILD") {
        const pids = (parentIds ?? []).filter(Boolean);
        await tx.guardianship.deleteMany({ where: { childId: m.id, parentId: { notIn: pids } } });
        for (const [i, pid] of pids.entries()) {
          await tx.guardianship.upsert({ where: { parentId_childId: { parentId: pid, childId: m.id } }, create: { parentId: pid, childId: m.id, isPrimary: i === 0 }, update: {} });
        }
      }
      if (fields.type === "MONITOR") {
        const gids = (monitorGroupIds ?? []).filter(Boolean);
        await tx.groupMonitor.deleteMany({ where: { memberId: m.id, groupId: { notIn: gids } } });
        for (const gid of gids) await tx.groupMonitor.upsert({ where: { groupId_memberId: { groupId: gid, memberId: m.id } }, create: { groupId: gid, memberId: m.id }, update: {} });
      }
      return m;
    });
    await audit(user.id, id ? "update" : "create", "Member", member.id, { name: `${member.firstName} ${member.lastName}` });
    revalidatePath("/dashboard", "layout");
    return { id: member.id };
  });
}

export async function deleteMember(id: string) {
  return runAction(zs.id, id, async (memberId) => {
    const user = await requirePermission("members.manage");
    const invoices = await db.invoice.count({ where: { payerId: memberId } });
    if (invoices) throw new ActionError("errors.inUse");
    const m = await db.member.delete({ where: { id: memberId } });
    await audit(user.id, "delete", "Member", memberId, { name: `${m.firstName} ${m.lastName}` });
    revalidatePath("/dashboard", "layout");
  });
}

const guardianSchema = z.object({ childId: zs.id, parentId: zs.id, relation: z.enum(GUARDIAN_RELATIONS).default("PARENT") });

export async function linkGuardian(fd: FormData) {
  return runAction(guardianSchema, formToObject(fd), async ({ childId, parentId, relation }) => {
    const user = await requirePermission("members.manage");
    const [child, parent] = await Promise.all([db.member.findUnique({ where: { id: childId } }), db.member.findUnique({ where: { id: parentId } })]);
    if (child?.type !== "CHILD" || !parent || parent.type === "CHILD") throw new ActionError("errors.validation");
    await db.guardianship.upsert({ where: { parentId_childId: { parentId, childId } }, create: { parentId, childId, relation }, update: { relation } });
    await audit(user.id, "link_guardian", "Member", childId, { parentId });
    revalidatePath(`/dashboard/members/${childId}`);
  });
}

export async function unlinkGuardian(childId: string, parentId: string) {
  return runAction(z.object({ childId: zs.id, parentId: zs.id }), { childId, parentId }, async (d) => {
    const user = await requirePermission("members.manage");
    await db.guardianship.delete({ where: { parentId_childId: d } });
    await audit(user.id, "unlink_guardian", "Member", childId, { parentId });
    revalidatePath(`/dashboard/members/${childId}`);
  });
}

/** Creates (or resets) the login account of a member. */
const accountSchema = z.object({ memberId: zs.id, email: z.string().trim().toLowerCase().email("errors.email"), password: z.string(), role: z.enum(["parent", "kid", "member", "monitor", "accountant", "admin"]) });

export async function createMemberAccount(fd: FormData) {
  return runAction(accountSchema, formToObject(fd), async ({ memberId, email, password, role }) => {
    const user = await requirePermission("users.manage");
    if (!isStrongPassword(password)) throw new ActionError("errors.weakPassword");
    if (role === "admin" && !user.permissions.has("roles.manage")) throw new ActionError("errors.forbidden");
    const member = await db.member.findUnique({ where: { id: memberId } });
    if (!member) throw new ActionError("errors.notFound");
    if (member.userId) throw new ActionError("errors.alreadyRegistered");
    if (await db.user.findUnique({ where: { email } })) throw new ActionError("errors.emailTaken");
    const roleRow = await db.role.findUniqueOrThrow({ where: { key: role } });
    const created = await db.user.create({
      data: { email, name: `${member.firstName} ${member.lastName}`, passwordHash: await hashPassword(password), roles: { create: [{ roleId: roleRow.id }] }, member: { connect: { id: memberId } } },
    });
    await audit(user.id, "create_account", "User", created.id, { memberId, role });
    revalidatePath(`/dashboard/members/${memberId}`);
  });
}

// ── CSV import ──
const IMPORT_COLUMNS = ["type", "firstName", "lastName", "dateOfBirth", "gender", "phone", "email", "address", "membershipStatus"] as const;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let quoted = false;
  const sep = text.split("\n")[0].includes(";") ? ";" : ",";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (field += '"'), i++;
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) cur.push(field), (field = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      cur.push(field);
      if (cur.some((x) => x.trim())) rows.push(cur);
      cur = [];
      field = "";
    } else field += c;
  }
  cur.push(field);
  if (cur.some((x) => x.trim())) rows.push(cur);
  return rows;
}

export async function importMembers(fd: FormData) {
  return runAction(z.object({ file: z.instanceof(File) }), { file: fd.get("file") }, async ({ file }) => {
    const user = await requirePermission("members.manage");
    if (file.size > 2_000_000) throw new ActionError("errors.uploadSize");
    const rows = parseCsv((await file.text()).replace(/^﻿/, ""));
    const header = rows.shift()?.map((h) => h.trim()) ?? [];
    const idx = Object.fromEntries(IMPORT_COLUMNS.map((c) => [c, header.indexOf(c)]));
    if (idx.firstName < 0 || idx.lastName < 0) throw new ActionError("errors.validation");
    let created = 0;
    const errors: number[] = [];
    for (const [n, r] of rows.entries()) {
      const get = (c: (typeof IMPORT_COLUMNS)[number]) => (idx[c] >= 0 ? r[idx[c]]?.trim() || undefined : undefined);
      const parsed = memberSchema.safeParse({
        type: (get("type") ?? "CHILD").toUpperCase(),
        firstName: get("firstName"),
        lastName: get("lastName"),
        dateOfBirth: get("dateOfBirth"),
        gender: get("gender")?.toUpperCase(),
        phone: get("phone"),
        email: get("email"),
        address: get("address"),
        membershipStatus: (get("membershipStatus") ?? "ACTIVE").toUpperCase(),
      });
      if (!parsed.success) {
        errors.push(n + 2);
        continue;
      }
      const { parentIds: _p, monitorGroupIds: _g, id: _i, ...d } = parsed.data;
      await db.member.create({ data: { ...d, membershipNumber: await nextMembershipNumber() } });
      created++;
    }
    await audit(user.id, "import", "Member", null, { created, errors: errors.length });
    revalidatePath("/dashboard", "layout");
    return { created, errorLines: errors.slice(0, 20) };
  });
}

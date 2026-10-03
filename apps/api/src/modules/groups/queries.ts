import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { AuthError, can } from "@api/lib/auth/guards";
import { myGroupIds } from "@api/lib/auth/scope";
import { addDaysLocal, normalizeDay } from "@api/modules/attendance/day";

/** Staff see every group; monitors (and any other non-admin) only the groups they monitor. */
export function seesAllGroups(user: CurrentUser) {
  return can(user, "groups.manage") || can(user, "members.read_all");
}

export async function groupScopeWhere(user: CurrentUser): Promise<Prisma.GroupWhereInput> {
  if (seesAllGroups(user)) return {};
  return { id: { in: await myGroupIds(user) } };
}

export async function assertCanSeeGroup(user: CurrentUser, groupId: string) {
  if (seesAllGroups(user)) return;
  if (!(await myGroupIds(user)).includes(groupId)) throw new AuthError("FORBIDDEN");
}

/** groups.manage, or being one of the group's monitors (for tasks / roster work). */
export async function canWorkOnGroup(user: CurrentUser, groupId: string) {
  if (can(user, "groups.manage")) return true;
  return (await myGroupIds(user)).includes(groupId);
}

export async function listGroups(user: CurrentUser, f: { q?: string; status?: string }) {
  const where: Prisma.GroupWhereInput = {
    AND: [
      await groupScopeWhere(user),
      f.q ? { OR: [{ name: { contains: f.q } }, { description: { contains: f.q } }, { location: { contains: f.q } }] } : {},
      f.status === "active" ? { isActive: true } : f.status === "inactive" ? { isActive: false } : {},
    ],
  };
  return db.group.findMany({
    where,
    orderBy: [{ isActive: "desc" }, { ageMin: "asc" }, { name: "asc" }],
    include: {
      monitors: { include: { member: { select: { id: true, firstName: true, lastName: true, photoUrl: true } } }, orderBy: { isLead: "desc" } },
      _count: { select: { children: true, activities: true } },
    },
  });
}

export async function getGroup(user: CurrentUser, id: string) {
  await assertCanSeeGroup(user, id);
  const group = await db.group.findUnique({
    where: { id },
    include: {
      monitors: { include: { member: { select: { id: true, firstName: true, lastName: true, photoUrl: true, phone: true, email: true, userId: true } } }, orderBy: { isLead: "desc" } },
      _count: { select: { children: true, activities: true, tasks: true } },
    },
  });
  if (!group) throw new AuthError("NOT_FOUND");
  return group;
}

export async function groupChildren(groupId: string) {
  return db.member.findMany({
    where: { groupId },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true, photoUrl: true, dateOfBirth: true, membershipStatus: true, medicalNotes: true, gender: true },
  });
}

/** Children not yet in this group (candidates for "add child"). */
export async function childCandidates(groupId: string) {
  return db.member.findMany({
    where: { type: "CHILD", OR: [{ groupId: null }, { groupId: { not: groupId } }], membershipStatus: { not: "INACTIVE" } },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: 400,
    select: { id: true, firstName: true, lastName: true, photoUrl: true, dateOfBirth: true, group: { select: { name: true, color: true } } },
  });
}

export async function monitorCandidates() {
  return db.member.findMany({
    where: { type: { in: ["MONITOR", "STAFF"] }, membershipStatus: { not: "INACTIVE" } },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true, type: true },
  });
}

export async function groupActivities(groupId: string) {
  return db.activity.findMany({
    where: { groupId },
    orderBy: [{ status: "asc" }, { dayOfWeek: "asc" }],
    include: { monitor: { select: { firstName: true, lastName: true } }, _count: { select: { participants: true } } },
  });
}

export async function groupAnnouncements(groupId: string) {
  return db.announcement.findMany({
    where: { audience: "GROUP", groupId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    take: 20,
    include: { author: { select: { name: true } } },
  });
}

export async function groupTasks(groupId: string) {
  return db.task.findMany({
    where: { groupId },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    include: { assignee: { select: { id: true, name: true } } },
  });
}

/** Attendance rate per session (date) for this group's meetings over the last `weeks` weeks. */
export async function groupAttendanceStats(groupId: string, weeks = 10) {
  const from = addDaysLocal(normalizeDay(), -weeks * 7);
  const rows = await db.attendance.findMany({
    where: { contextKey: `group:${groupId}`, date: { gte: from } },
    select: { date: true, status: true, memberId: true },
    orderBy: { date: "asc" },
  });
  const byDate = new Map<string, { date: Date; present: number; late: number; absent: number; excused: number; total: number }>();
  const perChild = new Map<string, { present: number; total: number }>();
  for (const r of rows) {
    const k = r.date.toISOString();
    const s = byDate.get(k) ?? { date: r.date, present: 0, late: 0, absent: 0, excused: 0, total: 0 };
    s.total++;
    if (r.status === "PRESENT") s.present++;
    else if (r.status === "LATE") s.late++;
    else if (r.status === "ABSENT") s.absent++;
    else s.excused++;
    byDate.set(k, s);
    const c = perChild.get(r.memberId) ?? { present: 0, total: 0 };
    c.total++;
    if (r.status === "PRESENT" || r.status === "LATE") c.present++;
    perChild.set(r.memberId, c);
  }
  const sessions = [...byDate.values()].map((s) => ({ ...s, rate: s.total ? Math.round(((s.present + s.late) / s.total) * 100) : 0 }));
  const totals = sessions.reduce((a, s) => ({ attended: a.attended + s.present + s.late, total: a.total + s.total }), { attended: 0, total: 0 });
  return { sessions, perChild, overall: totals.total ? Math.round((totals.attended / totals.total) * 100) : null };
}

export async function groupOptionsFor(user: CurrentUser) {
  return db.group.findMany({ where: { AND: [await groupScopeWhere(user), { isActive: true }] }, orderBy: { name: "asc" }, select: { id: true, name: true, color: true } });
}

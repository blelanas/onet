import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { AuthError, can } from "@api/lib/auth/guards";
import { myChildren, myGroupIds } from "@api/lib/auth/scope";
import { addDaysLocal, contextKeyOf, lastWeekday, normalizeDay, type AttendanceContext } from "./day";

export type ContextOption = {
  key: string;
  kind: "group" | "activity";
  id: string;
  name: string;
  color: string;
  category?: string;
  day: number | null;
  time: string | null;
};

const isAdminScope = (user: CurrentUser) => can(user, "members.read_all") || can(user, "groups.manage");

/** Groups & activities the user may take attendance for (monitors: their groups + activities they lead). */
export async function attendanceContexts(user: CurrentUser): Promise<ContextOption[]> {
  const admin = isAdminScope(user);
  const gids = admin ? null : await myGroupIds(user);
  const [groups, activities] = await Promise.all([
    db.group.findMany({ where: { isActive: true, ...(gids ? { id: { in: gids } } : {}) }, orderBy: { name: "asc" } }),
    db.activity.findMany({
      where: { status: "ACTIVE", ...(admin ? {} : { OR: [{ monitorId: user.memberId ?? "__none__" }, { groupId: { in: gids ?? [] } }] }) },
      orderBy: { title: "asc" },
    }),
  ]);
  return [
    ...groups.map((g) => ({ key: `group:${g.id}`, kind: "group" as const, id: g.id, name: g.name, color: g.color, day: g.meetingDay, time: g.meetingTime })),
    ...activities.map((a) => ({ key: `activity:${a.id}`, kind: "activity" as const, id: a.id, name: a.title, color: "", category: a.category, day: a.dayOfWeek, time: a.startTime })),
  ];
}

/** Throws FORBIDDEN unless the user may record attendance for this context. */
export async function assertContextAllowed(user: CurrentUser, ctx: AttendanceContext) {
  if (isAdminScope(user)) return;
  const gids = await myGroupIds(user);
  if (ctx.kind === "group") {
    if (!gids.includes(ctx.id)) throw new AuthError("FORBIDDEN");
    return;
  }
  const a = await db.activity.findUnique({ where: { id: ctx.id }, select: { monitorId: true, groupId: true } });
  if (!a) throw new AuthError("NOT_FOUND");
  if (!(user.memberId && a.monitorId === user.memberId) && !(a.groupId && gids.includes(a.groupId))) throw new AuthError("FORBIDDEN");
}

/** Default roll-call date: today when it is the meeting day (or no fixed day), else the last meeting day. */
export function defaultDate(day: number | null) {
  return day == null ? normalizeDay() : lastWeekday(day);
}

/** Members expected in a context + anyone already recorded for that date. */
export async function rosterFor(ctx: AttendanceContext, date: Date) {
  const select = { id: true, firstName: true, lastName: true, photoUrl: true, dateOfBirth: true, medicalNotes: true } as const;
  const [expected, records] = await Promise.all([
    ctx.kind === "group"
      ? db.member.findMany({ where: { groupId: ctx.id, membershipStatus: { not: "INACTIVE" } }, select, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] })
      : db.member.findMany({ where: { activityEnrollments: { some: { activityId: ctx.id } } }, select, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
    db.attendance.findMany({ where: { contextKey: contextKeyOf(ctx), date: normalizeDay(date) }, include: { member: { select } } }),
  ]);
  const byId = new Map(expected.map((m) => [m.id, m]));
  for (const r of records) if (!byId.has(r.memberId)) byId.set(r.memberId, r.member);
  const statuses = Object.fromEntries(records.map((r) => [r.memberId, { status: r.status, note: r.note ?? "" }]));
  const members = [...byId.values()].sort((a, b) => a.firstName.localeCompare(b.firstName));
  return { members, statuses, recordedAt: records.length ? records.reduce((m, r) => (r.updatedAt > m ? r.updatedAt : m), records[0].updatedAt) : null };
}

/** Sessions (context × date) with status counts, for the given contexts and period. */
export async function sessionsFor(contextKeys: string[], from: Date, to: Date) {
  if (!contextKeys.length) return [];
  const rows = await db.attendance.groupBy({
    by: ["contextKey", "date", "status"],
    where: { contextKey: { in: contextKeys }, date: { gte: from, lte: to } },
    _count: { _all: true },
  });
  const map = new Map<string, { contextKey: string; date: Date; counts: Record<string, number>; total: number }>();
  for (const r of rows) {
    const k = `${r.contextKey}|${r.date.toISOString()}`;
    const s = map.get(k) ?? { contextKey: r.contextKey, date: r.date, counts: {}, total: 0 };
    s.counts[r.status] = (s.counts[r.status] ?? 0) + r._count._all;
    s.total += r._count._all;
    map.set(k, s);
  }
  return [...map.values()].sort((a, b) => b.date.getTime() - a.date.getTime() || a.contextKey.localeCompare(b.contextKey));
}

/** Per-member rates in the given contexts and period. */
export async function memberRates(contextKeys: string[], from: Date, to: Date) {
  if (!contextKeys.length) return [];
  const rows = await db.attendance.groupBy({
    by: ["memberId", "status"],
    where: { contextKey: { in: contextKeys }, date: { gte: from, lte: to } },
    _count: { _all: true },
  });
  const map = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const c = map.get(r.memberId) ?? {};
    c[r.status] = (c[r.status] ?? 0) + r._count._all;
    map.set(r.memberId, c);
  }
  const members = await db.member.findMany({ where: { id: { in: [...map.keys()] } }, select: { id: true, firstName: true, lastName: true, photoUrl: true } });
  return members
    .map((m) => {
      const c = map.get(m.id) ?? {};
      const total = Object.values(c).reduce((s, n) => s + n, 0);
      const ok = (c.PRESENT ?? 0) + (c.LATE ?? 0);
      return { ...m, counts: c, total, rate: total ? Math.round((ok / total) * 100) : 0 };
    })
    .sort((a, b) => a.rate - b.rate || a.firstName.localeCompare(b.firstName));
}

export async function exportRows(contextKeys: string[], from: Date, to: Date) {
  const where: Prisma.AttendanceWhereInput = { contextKey: { in: contextKeys }, date: { gte: from, lte: to } };
  return db.attendance.findMany({
    where,
    orderBy: [{ date: "desc" }, { contextKey: "asc" }],
    include: {
      member: { select: { membershipNumber: true, firstName: true, lastName: true } },
      group: { select: { name: true } },
      activity: { select: { title: true } },
      recordedBy: { select: { name: true } },
    },
  });
}

/** Parent view: each child with their recent attendance records. */
export async function childrenAttendance(user: CurrentUser, weeks = 16) {
  const kids = await myChildren(user);
  const from = addDaysLocal(normalizeDay(), -weeks * 7);
  const records = await db.attendance.findMany({
    where: { memberId: { in: kids.map((k) => k.id) }, date: { gte: from } },
    orderBy: { date: "desc" },
    include: { group: { select: { name: true, color: true } }, activity: { select: { title: true, category: true } }, event: { select: { title: true } }, trip: { select: { title: true } } },
  });
  return kids.map((k) => ({ child: k, records: records.filter((r) => r.memberId === k.id) }));
}

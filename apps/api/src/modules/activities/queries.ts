import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { AuthError, can } from "@api/lib/auth/guards";
import { myChildren, myGroupIds, visibleMemberIds } from "@api/lib/auth/scope";

export type ActivityFilters = { q?: string; category?: string; status?: string; groupId?: string; mine?: boolean; excludeIds?: string[]; skip?: number; take?: number };

/** Staff with activities.manage see drafts/cancelled; everyone else only live/finished ones. */
export const canSeeDrafts = (user: CurrentUser) => can(user, "activities.manage");

/** Admin-level managers may edit any activity; monitors only those they lead or of their groups. */
export async function canManageActivity(user: CurrentUser, a: { monitorId: string | null; groupId: string | null }) {
  if (!can(user, "activities.manage")) return false;
  if (can(user, "members.read_all") || can(user, "groups.manage")) return true;
  if (user.memberId && a.monitorId === user.memberId) return true;
  return !!a.groupId && (await myGroupIds(user)).includes(a.groupId);
}

/** Members (the user and/or their children) whose activities are "theirs". */
export async function personalMemberIds(user: CurrentUser) {
  const kids = await myChildren(user);
  const ids = kids.map((k) => k.id);
  if (user.memberId) ids.push(user.memberId);
  return { ids, groupIds: [...new Set(kids.map((k) => k.groupId).filter((x): x is string => !!x))] };
}

/** Where-clause for "activities relevant to me" (parents/kids: enrolled or group; monitors: led or their groups). */
export async function mineWhere(user: CurrentUser): Promise<Prisma.ActivityWhereInput> {
  const { ids, groupIds } = await personalMemberIds(user);
  const own = user.memberId ? await db.member.findUnique({ where: { id: user.memberId }, select: { groupId: true } }) : null;
  const gids = [...groupIds, ...(own?.groupId ? [own.groupId] : []), ...(await myGroupIds(user))];
  const or: Prisma.ActivityWhereInput[] = [];
  if (ids.length) or.push({ participants: { some: { memberId: { in: ids } } } });
  if (gids.length) or.push({ groupId: { in: gids } });
  if (user.memberId) or.push({ monitorId: user.memberId });
  return or.length ? { OR: or } : { id: "__none__" };
}

function baseWhere(user: CurrentUser, f: ActivityFilters): Prisma.ActivityWhereInput {
  const terms = f.q?.trim().split(/\s+/).slice(0, 4) ?? [];
  return {
    AND: [
      canSeeDrafts(user) ? (f.status ? { status: f.status } : {}) : { status: f.status && ["ACTIVE", "COMPLETED"].includes(f.status) ? f.status : { in: ["ACTIVE", "COMPLETED"] } },
      f.category ? { category: f.category } : {},
      f.groupId ? { groupId: f.groupId } : {},
      f.excludeIds?.length ? { id: { notIn: f.excludeIds } } : {},
      ...terms.map((t) => ({ OR: [{ title: { contains: t } }, { description: { contains: t } }, { location: { contains: t } }] })),
    ],
  };
}

const cardInclude = {
  group: { select: { id: true, name: true, color: true } },
  monitor: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { participants: true } },
} satisfies Prisma.ActivityInclude;

export async function listActivities(user: CurrentUser, f: ActivityFilters) {
  const where: Prisma.ActivityWhereInput = { AND: [baseWhere(user, f), f.mine ? await mineWhere(user) : {}] };
  const [rows, total] = await Promise.all([
    db.activity.findMany({ where, include: cardInclude, orderBy: [{ status: "asc" }, { dayOfWeek: "asc" }, { startTime: "asc" }, { title: "asc" }], skip: f.skip, take: f.take }),
    db.activity.count({ where }),
  ]);
  return { rows, total };
}

/** Activities of the user / their children (enrolled or through the group), with who is concerned. */
export async function myActivities(user: CurrentUser) {
  const { ids } = await personalMemberIds(user);
  const rows = await db.activity.findMany({
    where: { AND: [{ status: { in: ["ACTIVE", "COMPLETED"] } }, await mineWhere(user)] },
    include: { ...cardInclude, participants: { where: { memberId: { in: ids } }, select: { member: { select: { id: true, firstName: true } } } } },
    orderBy: [{ status: "asc" }, { dayOfWeek: "asc" }],
  });
  return rows;
}

export async function activityStats(user: CurrentUser) {
  const where = canSeeDrafts(user) ? {} : { status: { in: ["ACTIVE", "COMPLETED"] } };
  const [byCategory, active, participants] = await Promise.all([
    db.activity.groupBy({ by: ["category"], where, _count: { _all: true } }),
    db.activity.count({ where: { status: "ACTIVE" } }),
    db.activityParticipant.count({ where: { activity: { status: "ACTIVE" } } }),
  ]);
  return { byCategory: Object.fromEntries(byCategory.map((c) => [c.category, c._count._all])) as Record<string, number>, active, participants };
}

export async function getActivity(user: CurrentUser, id: string) {
  const a = await db.activity.findUnique({
    where: { id },
    include: {
      group: { select: { id: true, name: true, color: true, icon: true } },
      monitor: { select: { id: true, firstName: true, lastName: true, photoUrl: true, phone: true, userId: true } },
      event: { select: { id: true, title: true, startAt: true } },
      _count: { select: { participants: true, reports: true } },
    },
  });
  if (!a) throw new AuthError("NOT_FOUND");
  if (!canSeeDrafts(user) && !["ACTIVE", "COMPLETED"].includes(a.status)) throw new AuthError("NOT_FOUND");
  return a;
}

/** Participants restricted to the members the user may see (kids/parents: only their own). */
export async function activityParticipants(user: CurrentUser, activityId: string) {
  const visible = await visibleMemberIds(user);
  return db.activityParticipant.findMany({
    where: { activityId, ...(visible === "all" ? {} : { memberId: { in: visible } }) },
    orderBy: { member: { firstName: "asc" } },
    include: { member: { select: { id: true, firstName: true, lastName: true, photoUrl: true, dateOfBirth: true, group: { select: { name: true, color: true } } } } },
  });
}

/** Children a manager may enroll: all children for staff, the monitor's visible children otherwise. */
export async function enrollCandidates(user: CurrentUser, activityId: string) {
  const visible = await visibleMemberIds(user);
  return db.member.findMany({
    where: {
      type: "CHILD",
      membershipStatus: { not: "INACTIVE" },
      activityEnrollments: { none: { activityId } },
      ...(visible === "all" ? {} : { id: { in: visible } }),
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: 400,
    select: { id: true, firstName: true, lastName: true, photoUrl: true, dateOfBirth: true, group: { select: { name: true, color: true } } },
  });
}

/** Attendance sessions for this activity (per date). Non-staff only see their own rows. */
export async function activityAttendance(user: CurrentUser, activityId: string) {
  const visible = await visibleMemberIds(user);
  const rows = await db.attendance.findMany({
    where: { contextKey: `activity:${activityId}`, ...(visible === "all" ? {} : { memberId: { in: visible } }) },
    orderBy: { date: "desc" },
    take: 600,
    select: { date: true, status: true, member: { select: { id: true, firstName: true, lastName: true } } },
  });
  const map = new Map<string, { date: Date; counts: Record<string, number>; total: number; rows: typeof rows }>();
  for (const r of rows) {
    const k = r.date.toISOString();
    const s = map.get(k) ?? { date: r.date, counts: {}, total: 0, rows: [] };
    s.counts[r.status] = (s.counts[r.status] ?? 0) + 1;
    s.total++;
    s.rows.push(r);
    map.set(k, s);
  }
  return [...map.values()].slice(0, 12);
}

export async function activityReports(activityId: string) {
  return db.activityReport.findMany({ where: { activityId }, orderBy: { date: "desc" }, include: { author: { select: { id: true, name: true } } }, take: 50 });
}

export async function activityFormOptions() {
  const [monitors, groups, events] = await Promise.all([
    db.member.findMany({ where: { type: "MONITOR" }, orderBy: [{ firstName: "asc" }], select: { id: true, firstName: true, lastName: true } }),
    db.group.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.event.findMany({ where: { endAt: { gte: new Date(Date.now() - 180 * 86400_000) } }, orderBy: { startAt: "asc" }, select: { id: true, title: true, startAt: true } }),
  ]);
  return { monitors, groups, events };
}

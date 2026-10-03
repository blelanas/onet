import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { AuthError, can } from "@api/lib/auth/guards";
import { myChildren, myGroupIds } from "@api/lib/auth/scope";
import { CATEGORY_COLORS } from "@api/lib/constants";
import { addDaysLocal, normalizeDay } from "@api/modules/attendance/day";

export const CAL_KINDS = ["activity", "group", "event", "trip", "conference", "entry"] as const;
export type CalKind = (typeof CAL_KINDS)[number];

export type CalItem = {
  id: string;
  kind: CalKind;
  title: string;
  start: Date;
  end: Date | null;
  allDay: boolean;
  color: string;
  href: string | null;
  location?: string | null;
  entryType?: string;
  mine?: boolean;
};

export const ENTRY_COLORS: Record<string, string> = { MEETING: "#64748B", HOLIDAY: "#00A3A3", IMPORTANT: "#E30613", OTHER: "#7C4DFF" };
export const KIND_COLORS: Record<CalKind, string> = { activity: "#7C4DFF", group: "#1E9BD7", event: "#E8457C", trip: "#2BB673", conference: "#FF6B4A", entry: "#64748B" };

/** Audiences of free calendar entries visible to this user. */
export function entryAudiences(user: CurrentUser): string[] | "all" {
  if (can(user, "calendar.manage")) return "all";
  const a = new Set(["ALL"]);
  if (user.roles.includes("parent")) a.add("PARENTS");
  if (user.roles.includes("kid")) a.add("KIDS");
  if (user.roles.includes("monitor")) {
    a.add("MONITORS");
    a.add("STAFF");
  }
  if (user.roles.some((r) => r === "admin" || r === "super_admin" || r === "accountant")) a.add("STAFF");
  return [...a];
}

/** Whether a user can switch to "only mine" (people with personal ties: parents, kids, monitors, members). */
export async function personalScope(user: CurrentUser) {
  const kids = await myChildren(user);
  const memberIds = [...kids.map((k) => k.id), ...(user.memberId ? [user.memberId] : [])];
  const own = user.memberId ? await db.member.findUnique({ where: { id: user.memberId }, select: { groupId: true } }) : null;
  const monitored = await myGroupIds(user);
  const groupIds = [...new Set([...kids.map((k) => k.groupId).filter((x): x is string => !!x), ...(own?.groupId ? [own.groupId] : []), ...monitored])];
  return { memberIds, groupIds, monitored };
}

/** Weekly occurrences of `dow` at `time` between [from, to) clipped to [start, end]. */
function weekly(dow: number, time: string | null, from: Date, to: Date, start?: Date | null, end?: Date | null) {
  const out: Date[] = [];
  let d = addDaysLocal(normalizeDay(from), (dow - from.getDay() + 7) % 7);
  const [h, m] = (time ?? "00:00").split(":").map(Number);
  const s = start ? normalizeDay(start) : null;
  const e = end ? normalizeDay(end) : null;
  while (d < to) {
    if ((!s || d >= s) && (!e || d <= e)) {
      const x = new Date(d);
      x.setHours(h || 0, m || 0, 0, 0);
      out.push(x);
    }
    d = addDaysLocal(d, 7);
  }
  return out;
}

export async function calendarItems(user: CurrentUser, opts: { from: Date; to: Date; kinds: CalKind[]; groupId?: string; mine: boolean }): Promise<CalItem[]> {
  const { from, to, kinds, groupId, mine } = opts;
  const scope = await personalScope(user);
  const items: CalItem[] = [];
  const want = (k: CalKind) => kinds.includes(k);

  // Recurring activities
  if (want("activity") && can(user, "activities.read")) {
    const or: Prisma.ActivityWhereInput[] = [];
    if (mine) {
      if (scope.memberIds.length) or.push({ participants: { some: { memberId: { in: scope.memberIds } } } });
      if (scope.groupIds.length) or.push({ groupId: { in: scope.groupIds } });
      if (user.memberId) or.push({ monitorId: user.memberId });
    }
    const acts = await db.activity.findMany({
      where: {
        status: "ACTIVE",
        dayOfWeek: { not: null },
        ...(groupId ? { groupId } : {}),
        ...(mine ? (or.length ? { OR: or } : { id: "__none__" }) : {}),
        AND: [{ OR: [{ startDate: null }, { startDate: { lt: to } }] }, { OR: [{ endDate: null }, { endDate: { gte: from } }] }],
      },
      select: { id: true, title: true, category: true, dayOfWeek: true, startTime: true, durationMin: true, startDate: true, endDate: true, location: true },
    });
    for (const a of acts)
      for (const d of weekly(a.dayOfWeek!, a.startTime, from, to, a.startDate, a.endDate))
        items.push({ id: `activity:${a.id}:${d.getTime()}`, kind: "activity", title: a.title, start: d, end: new Date(d.getTime() + a.durationMin * 60_000), allDay: !a.startTime, color: CATEGORY_COLORS[a.category] ?? KIND_COLORS.activity, href: `/dashboard/activities/${a.id}`, location: a.location });
  }

  // Group meetings (staff with groups.read see all; others only their/their children's groups)
  if (want("group")) {
    const all = can(user, "groups.manage") || can(user, "members.read_all");
    const ids = mine || !all ? scope.groupIds : null;
    if (!ids || ids.length) {
      const groups = await db.group.findMany({
        where: { isActive: true, meetingDay: { not: null }, ...(ids ? { id: { in: ids } } : {}), ...(groupId ? { id: groupId } : {}) },
        select: { id: true, name: true, color: true, meetingDay: true, meetingTime: true, location: true },
      });
      const linkable = can(user, "groups.read");
      const mineIds = new Set(scope.monitored);
      for (const g of groups)
        for (const d of weekly(g.meetingDay!, g.meetingTime, from, to))
          items.push({ id: `group:${g.id}:${d.getTime()}`, kind: "group", title: g.name, start: d, end: null, allDay: !g.meetingTime, color: g.color, href: linkable && (all || mineIds.has(g.id)) ? `/dashboard/groups/${g.id}` : null, location: g.location });
    }
  }

  // Events
  if (want("event") && can(user, "events.read") && !groupId) {
    const events = await db.event.findMany({
      where: {
        startAt: { lt: to },
        endAt: { gte: from },
        ...(can(user, "events.manage") ? {} : { status: { in: ["PUBLISHED", "COMPLETED"] } }),
        ...(mine ? { registrations: { some: { memberId: { in: scope.memberIds.length ? scope.memberIds : ["__none__"] }, status: { not: "CANCELLED" } } } } : {}),
      },
      select: { id: true, title: true, startAt: true, endAt: true, location: true, category: true },
    });
    for (const e of events) items.push({ id: `event:${e.id}`, kind: "event", title: e.title, start: e.startAt, end: e.endAt, allDay: false, color: KIND_COLORS.event, href: `/dashboard/events/${e.id}`, location: e.location });
  }

  // Trips (multi-day spans)
  if (want("trip") && can(user, "trips.read") && !groupId) {
    const trips = await db.trip.findMany({
      where: {
        departAt: { lt: to },
        returnAt: { gte: from },
        ...(can(user, "trips.manage") ? {} : { status: { notIn: ["DRAFT", "CANCELLED"] } }),
        ...(mine
          ? {
              OR: [
                { registrations: { some: { memberId: { in: scope.memberIds.length ? scope.memberIds : ["__none__"] }, status: { not: "CANCELLED" } } } },
                ...(user.memberId ? [{ monitors: { some: { memberId: user.memberId } } }] : []),
              ],
            }
          : {}),
      },
      select: { id: true, title: true, departAt: true, returnAt: true, destination: true },
    });
    for (const t of trips) items.push({ id: `trip:${t.id}`, kind: "trip", title: t.title, start: t.departAt, end: t.returnAt, allDay: false, color: KIND_COLORS.trip, href: `/dashboard/trips/${t.id}`, location: t.destination });
  }

  // Conferences
  if (want("conference") && can(user, "content.read") && !groupId && !mine) {
    const confs = await db.conference.findMany({ where: { date: { gte: from, lt: to } }, select: { id: true, title: true, date: true, location: true } });
    for (const c of confs) items.push({ id: `conference:${c.id}`, kind: "conference", title: c.title, start: c.date, end: null, allDay: false, color: KIND_COLORS.conference, href: `/dashboard/content/conferences/${c.id}`, location: c.location });
  }

  // Free entries (meetings, holidays, important dates) filtered by audience
  if (want("entry") && !groupId) {
    const aud = entryAudiences(user);
    const entries = await db.calendarEntry.findMany({
      where: {
        ...(aud === "all" ? {} : { audience: { in: aud } }),
        OR: [
          { endAt: null, startAt: { gte: from, lt: to } },
          { endAt: { gte: from }, startAt: { lt: to } },
        ],
      },
    });
    for (const e of entries) items.push({ id: `entry:${e.id}`, kind: "entry", title: e.title, start: e.startAt, end: e.endAt, allDay: e.allDay, color: ENTRY_COLORS[e.type] ?? KIND_COLORS.entry, href: null, location: e.location, entryType: e.type });
  }

  return items.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export async function getEntry(user: CurrentUser, id: string) {
  const e = await db.calendarEntry.findUnique({ where: { id }, include: { createdBy: { select: { name: true } } } });
  if (!e) throw new AuthError("NOT_FOUND");
  const aud = entryAudiences(user);
  if (aud !== "all" && !aud.includes(e.audience)) throw new AuthError("NOT_FOUND");
  return e;
}

export async function calendarGroupOptions(user: CurrentUser) {
  const all = can(user, "groups.manage") || can(user, "members.read_all");
  const scope = all ? null : await personalScope(user);
  return db.group.findMany({ where: { isActive: true, ...(scope ? { id: { in: scope.groupIds } } : {}) }, orderBy: { name: "asc" }, select: { id: true, name: true, color: true } });
}

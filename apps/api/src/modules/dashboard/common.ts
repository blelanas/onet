import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import { addDays, startOfDay } from "@api/lib/dates";
import { CATEGORY_COLORS } from "@api/lib/constants";

/** An entry of a dashboard agenda (events, trips, recurring sessions, calendar entries). */
export type AgendaItem = {
  id: string;
  kind: "event" | "trip" | "activity" | "group" | "calendar";
  title: string;
  at: Date;
  location?: string | null;
  color: string;
  href: string;
  /** Group id when the session is a group meeting/activity (for the "take attendance" CTA). */
  groupId?: string | null;
  category?: string;
};

/** Occurrences of a weekly slot (day 0..6 + "HH:mm") between two dates. */
export function weeklyOccurrences(dayOfWeek: number | null | undefined, time: string | null | undefined, from: Date, to: Date): Date[] {
  if (dayOfWeek == null) return [];
  const [h, m] = (time ?? "00:00").split(":").map((n) => Number(n) || 0);
  const out: Date[] = [];
  const d = startOfDay(from);
  while (d < to) {
    if (d.getDay() === dayOfWeek) {
      const x = new Date(d);
      x.setHours(h, m, 0, 0);
      if (x >= from && x < to) out.push(x);
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** Next occurrence of a weekly slot from now (today's later slot counts). */
export function nextOccurrence(dayOfWeek: number | null | undefined, time: string | null | undefined, from = new Date()): Date | null {
  return weeklyOccurrences(dayOfWeek, time, startOfDay(from), addDays(startOfDay(from), 8))[0] ?? null;
}

/** First day (Monday 00:00) of the current week. */
export function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  const diff = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}

export function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

type ActivityFilter = Prisma.ActivityWhereInput;

/** Weekly activity sessions projected between two dates. */
export async function activitySessions(where: ActivityFilter, from: Date, to: Date): Promise<AgendaItem[]> {
  const acts = await db.activity.findMany({
    where: {
      AND: [
        where,
        { status: "ACTIVE", dayOfWeek: { not: null } },
        { OR: [{ startDate: null }, { startDate: { lte: to } }] },
        { OR: [{ endDate: null }, { endDate: { gte: from } }] },
      ],
    },
    select: { id: true, title: true, dayOfWeek: true, startTime: true, location: true, category: true, groupId: true, group: { select: { color: true } } },
  });
  return acts.flatMap((a) =>
    weeklyOccurrences(a.dayOfWeek, a.startTime, from, to).map((at) => ({
      id: `act-${a.id}-${at.getTime()}`,
      kind: "activity" as const,
      title: a.title,
      at,
      location: a.location,
      color: CATEGORY_COLORS[a.category] ?? a.group?.color ?? "#E30613",
      href: `/dashboard/activities/${a.id}`,
      groupId: a.groupId,
      category: a.category,
    })),
  );
}

/** Weekly group meetings projected between two dates. */
export async function groupSessions(where: Prisma.GroupWhereInput, from: Date, to: Date): Promise<AgendaItem[]> {
  const groups = await db.group.findMany({ where: { AND: [where, { isActive: true, meetingDay: { not: null } }] }, select: { id: true, name: true, meetingDay: true, meetingTime: true, location: true, color: true } });
  return groups.flatMap((g) =>
    weeklyOccurrences(g.meetingDay, g.meetingTime, from, to).map((at) => ({
      id: `grp-${g.id}-${at.getTime()}`,
      kind: "group" as const,
      title: g.name,
      at,
      location: g.location,
      color: g.color,
      href: `/dashboard/groups/${g.id}`,
      groupId: g.id,
    })),
  );
}

/** Upcoming events/trips (+ optional calendar entries) in a window. Never includes drafts or cancelled items. */
export async function eventsAndTrips(from: Date, to: Date, opts: { publicOnly?: boolean; calendarAudiences?: string[] } = {}): Promise<AgendaItem[]> {
  const [events, trips, entries] = await Promise.all([
    db.event.findMany({
      where: { startAt: { gte: from, lt: to }, status: "PUBLISHED", ...(opts.publicOnly ? { isPublic: true } : {}) },
      orderBy: { startAt: "asc" },
      select: { id: true, title: true, startAt: true, location: true, category: true },
    }),
    db.trip.findMany({
      where: { departAt: { gte: from, lt: to }, status: { in: ["OPEN", "FULL", "CLOSED"] }, ...(opts.publicOnly ? { isPublic: true } : {}) },
      orderBy: { departAt: "asc" },
      select: { id: true, title: true, departAt: true, destination: true, category: true },
    }),
    opts.calendarAudiences
      ? db.calendarEntry.findMany({ where: { startAt: { gte: from, lt: to }, audience: { in: opts.calendarAudiences } }, orderBy: { startAt: "asc" } })
      : Promise.resolve([]),
  ]);
  return [
    ...events.map((e) => ({ id: `evt-${e.id}`, kind: "event" as const, title: e.title, at: e.startAt, location: e.location, color: CATEGORY_COLORS[e.category] ?? "#E30613", href: `/dashboard/events/${e.id}`, category: e.category })),
    ...trips.map((t) => ({ id: `trp-${t.id}`, kind: "trip" as const, title: t.title, at: t.departAt, location: t.destination, color: CATEGORY_COLORS[t.category] ?? "#1E9BD7", href: `/dashboard/trips/${t.id}`, category: t.category })),
    ...entries.map((c) => ({ id: `cal-${c.id}`, kind: "calendar" as const, title: c.title, at: c.startAt, location: c.location, color: c.type === "HOLIDAY" ? "#2BB673" : c.type === "IMPORTANT" ? "#FF6B4A" : "#64748B", href: "/dashboard/calendar" })),
  ];
}

export function sortAgenda(items: AgendaItem[], limit?: number) {
  const sorted = [...items].sort((a, b) => a.at.getTime() - b.at.getTime());
  return limit ? sorted.slice(0, limit) : sorted;
}

/** Announcements currently visible for the given audiences (+ optional group-specific ones). */
export function announcementsFor(audiences: string[], groupIds: string[] = [], take = 4) {
  const now = new Date();
  return db.announcement.findMany({
    where: {
      publishedAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      AND: [{ OR: [{ audience: { in: audiences } }, ...(groupIds.length ? [{ audience: "GROUP", groupId: { in: groupIds } }] : [])] }],
    },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    take,
    select: { id: true, title: true, body: true, priority: true, isPinned: true, publishedAt: true, audience: true, group: { select: { name: true, color: true } } },
  });
}
export type AnnouncementRow = Awaited<ReturnType<typeof announcementsFor>>[number];

export function latestNotifications(userId: string, take = 5) {
  return db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take, select: { id: true, type: true, title: true, body: true, link: true, readAt: true, createdAt: true } });
}
export type NotificationRow = Awaited<ReturnType<typeof latestNotifications>>[number];

/** Six-month revenue (completed payments) vs expenses, oldest month first. */
export async function revenueExpenseTrend(months = 6) {
  const now = new Date();
  const ranges = Array.from({ length: months }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1) };
  });
  const rows = await Promise.all(
    ranges.map(async ({ start, end }) => {
      const [rev, exp] = await Promise.all([
        db.payment.aggregate({ _sum: { amount: true }, where: { status: "COMPLETED", paidAt: { gte: start, lt: end } } }),
        db.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: start, lt: end } } }),
      ]);
      return { month: start, revenue: rev._sum.amount ?? 0, expenses: exp._sum.amount ?? 0 };
    }),
  );
  return rows;
}

/** Weekly attendance rate (present + late / all records) over the last N weeks. */
export async function weeklyAttendance(weeks = 8, where: Prisma.AttendanceWhereInput = {}) {
  const thisWeek = startOfWeek();
  const from = addDays(thisWeek, -7 * (weeks - 1));
  const rows = await db.attendance.groupBy({ by: ["date", "status"], where: { ...where, date: { gte: from } }, _count: { _all: true } });
  const buckets = Array.from({ length: weeks }, (_, i) => ({ week: addDays(from, i * 7), present: 0, total: 0 }));
  for (const r of rows) {
    const idx = Math.floor((startOfDay(r.date).getTime() - from.getTime()) / (7 * 86400_000));
    const b = buckets[idx];
    if (!b) continue;
    b.total += r._count._all;
    if (r.status === "PRESENT" || r.status === "LATE") b.present += r._count._all;
  }
  return buckets.map((b) => ({ week: b.week, rate: b.total ? Math.round((b.present / b.total) * 100) : 0, total: b.total }));
}

/** Outstanding balance of open invoices matching `where` (amount − completed payments). */
export async function outstanding(where: Prisma.InvoiceWhereInput) {
  const open: Prisma.InvoiceWhereInput = { AND: [where, { status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] } }] };
  const [billed, paid, count] = await Promise.all([
    db.invoice.aggregate({ _sum: { amount: true }, where: open }),
    db.payment.aggregate({ _sum: { amount: true }, where: { status: "COMPLETED", invoice: open } }),
    db.invoice.count({ where: open }),
  ]);
  return { amount: Math.max(0, (billed._sum.amount ?? 0) - (paid._sum.amount ?? 0)), count };
}

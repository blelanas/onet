import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { myChildren } from "@api/lib/auth/scope";
import { addDays, startOfDay } from "@api/lib/dates";
import { paidAmount } from "@api/lib/services/invoices";
import { activitySessions, announcementsFor, groupSessions, latestNotifications, sortAgenda } from "./common";

type KidRow = Awaited<ReturnType<typeof myChildren>>[number];

/** Only what the parent screens display — never staff-only fields such as internal notes. */
export function publicKid(k: KidRow) {
  return {
    id: k.id,
    firstName: k.firstName,
    lastName: k.lastName,
    photoUrl: k.photoUrl,
    dateOfBirth: k.dateOfBirth,
    membershipStatus: k.membershipStatus,
    points: k.points,
    groupId: k.groupId,
    group: k.group ? { id: k.group.id, name: k.group.name, color: k.group.color } : null,
  };
}

/** Attendance summary of one child over the last `days` days. */
export async function attendanceSummary(childId: string, days = 90) {
  const rows = await db.attendance.groupBy({ by: ["status"], where: { memberId: childId, date: { gte: addDays(new Date(), -days) } }, _count: { _all: true } });
  const by = Object.fromEntries(rows.map((r) => [r.status, r._count._all])) as Record<string, number>;
  const total = rows.reduce((s, r) => s + r._count._all, 0);
  const present = (by.PRESENT ?? 0) + (by.LATE ?? 0);
  return { total, present, absent: by.ABSENT ?? 0, late: by.LATE ?? 0, excused: by.EXCUSED ?? 0, rate: total ? Math.round((present / total) * 100) : null };
}

/** Upcoming sessions of a child (group meetings + enrolled activities). */
export async function childSessions(child: { id: string; groupId: string | null }, from: Date, to: Date) {
  const [g, a] = await Promise.all([
    child.groupId ? groupSessions({ id: child.groupId }, from, to) : Promise.resolve([]),
    activitySessions({ participants: { some: { memberId: child.id } } }, from, to),
  ]);
  return sortAgenda([...g, ...a]);
}

/** Upcoming events & trips with the child's registration status (if any). */
export async function childUpcoming(childId: string, take = 6) {
  const now = new Date();
  const [events, trips] = await Promise.all([
    db.event.findMany({
      where: { startAt: { gte: now }, status: "PUBLISHED", isPublic: true },
      orderBy: { startAt: "asc" },
      take,
      select: { id: true, title: true, startAt: true, location: true, category: true, coverUrl: true, registrations: { where: { memberId: childId }, select: { status: true } } },
    }),
    db.trip.findMany({
      where: { departAt: { gte: now }, status: { in: ["OPEN", "FULL", "CLOSED"] }, isPublic: true },
      orderBy: { departAt: "asc" },
      take,
      select: { id: true, title: true, departAt: true, destination: true, category: true, coverUrl: true, ageMin: true, ageMax: true, registrations: { where: { memberId: childId }, select: { status: true, parentConsent: true, documentsStatus: true } } },
    }),
  ]);
  return [
    ...events.map((e) => ({ id: e.id, kind: "event" as const, title: e.title, at: e.startAt, place: e.location, category: e.category, coverUrl: e.coverUrl, href: `/dashboard/events/${e.id}`, registration: e.registrations[0] ?? null })),
    ...trips.map((t) => ({ id: t.id, kind: "trip" as const, title: t.title, at: t.departAt, place: t.destination, category: t.category, coverUrl: t.coverUrl, href: `/dashboard/trips/${t.id}`, registration: t.registrations[0] ?? null })),
  ]
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, take);
}

export async function parentDashboard(user: CurrentUser, childParam?: string) {
  const kids = await myChildren(user);
  const child = kids.find((k) => k.id === childParam) ?? kids[0] ?? null;
  const today = startOfDay();
  const groupIds = [...new Set(kids.map((k) => k.groupId).filter(Boolean))] as string[];
  const payerId = user.memberId ?? "__none__";

  const [childData, invoices, notifications, announcements, unreadMessages] = await Promise.all([
    child
      ? Promise.all([
          child.groupId
            ? db.group.findUnique({ where: { id: child.groupId }, select: { id: true, name: true, color: true, schedule: true, location: true, monitors: { select: { isLead: true, member: { select: { id: true, firstName: true, lastName: true, photoUrl: true, userId: true } } } } } })
            : null,
          childSessions(child, today, addDays(today, 14)),
          attendanceSummary(child.id),
          childUpcoming(child.id, 6),
          db.memberBadge.count({ where: { memberId: child.id } }),
          db.attendance.findMany({ where: { memberId: child.id }, orderBy: { date: "desc" }, take: 10, select: { id: true, date: true, status: true } }),
        ])
      : null,
    db.invoice.findMany({
      where: { payerId, status: { not: "CANCELLED" } },
      orderBy: { dueDate: "asc" },
      select: { id: true, number: true, description: true, amount: true, status: true, dueDate: true, childId: true, payments: { select: { amount: true, status: true } } },
    }),
    latestNotifications(user.id, 4),
    announcementsFor(["ALL", "PARENTS"], groupIds, 3),
    db.conversationParticipant.findMany({
      where: { userId: user.id },
      select: { lastReadAt: true, conversation: { select: { messages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true, senderId: true } } } } },
    }),
  ]);

  const open = invoices.filter((i) => i.status !== "PAID");
  const balance = open.reduce((s, i) => s + Math.max(0, i.amount - paidAmount(i)), 0);
  const childBalance = child ? open.filter((i) => i.childId === child.id).reduce((s, i) => s + Math.max(0, i.amount - paidAmount(i)), 0) : 0;
  const unread = unreadMessages.filter((c) => {
    const last = c.conversation.messages[0];
    return last && last.senderId !== user.id && (!c.lastReadAt || last.createdAt > c.lastReadAt);
  }).length;

  return {
    kids: kids.map(publicKid),
    child: child ? publicKid(child) : null,
    group: childData?.[0] ?? null,
    sessions: (childData?.[1] ?? []).slice(0, 5),
    attendance: childData?.[2] ?? null,
    upcoming: childData?.[3] ?? [],
    badgeCount: childData?.[4] ?? 0,
    recentAttendance: (childData?.[5] ?? []).reverse(),
    finance: {
      balance,
      childBalance,
      openCount: open.length,
      overdueCount: open.filter((i) => i.status === "OVERDUE" || i.dueDate < new Date()).length,
      paidCount: invoices.length - open.length,
      nextDue: open.map((i) => ({ ...i, remaining: i.amount - paidAmount(i) })).slice(0, 3),
    },
    notifications,
    announcements,
    unreadMessages: unread,
  };
}

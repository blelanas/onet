import "server-only";
import { db } from "@/lib/db";
import { can } from "@/lib/auth/guards";
import type { CurrentUser } from "@/lib/auth/session";
import { addDays, startOfDay } from "@/lib/dates";
import { activitySessions, eventsAndTrips, latestNotifications, outstanding, revenueExpenseTrend, sortAgenda, startOfMonth, weeklyAttendance } from "./common";

export type FeedItem = { id: string; kind: "member" | "payment" | "report" | "announcement"; title: string; detail?: string; at: Date; href: string; amount?: number };

/** Everything the super admin / admin dashboard shows, in parallel. */
export async function adminDashboard(user: CurrentUser) {
  const now = new Date();
  const today = startOfDay(now);
  const in14 = addDays(today, 15);
  const finance = can(user, "finance.read");
  const monthStart = startOfMonth(now);

  const [
    members,
    children,
    parents,
    monitors,
    upcomingEvents,
    upcomingTrips,
    pendingJoin,
    pendingEventRegs,
    pendingTripRegs,
    revenueMonth,
    pending,
    groups,
    trend,
    attendance,
    eventRegs,
    tripRegs,
    agendaEvents,
    agendaSessions,
    notifications,
    feed,
  ] = await Promise.all([
    db.member.count(),
    db.member.count({ where: { type: "CHILD" } }),
    db.member.count({ where: { type: "PARENT" } }),
    db.member.count({ where: { type: "MONITOR", membershipStatus: "ACTIVE" } }),
    db.event.count({ where: { startAt: { gte: now }, status: "PUBLISHED" } }),
    db.trip.count({ where: { departAt: { gte: now }, status: { in: ["OPEN", "FULL", "CLOSED"] } } }),
    db.joinRequest.count({ where: { status: "PENDING" } }),
    db.eventRegistration.count({ where: { status: "PENDING" } }),
    db.tripRegistration.count({ where: { status: "PENDING" } }),
    finance ? db.payment.aggregate({ _sum: { amount: true }, where: { status: "COMPLETED", paidAt: { gte: monthStart } } }) : null,
    finance ? outstanding({}) : null,
    db.group.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, color: true, _count: { select: { children: true } } } }),
    finance ? revenueExpenseTrend(6) : null,
    weeklyAttendance(8),
    db.eventRegistration.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, status: true, createdAt: true, eventId: true, event: { select: { title: true } }, member: { select: { id: true, firstName: true, lastName: true, photoUrl: true } } },
    }),
    db.tripRegistration.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, status: true, createdAt: true, tripId: true, trip: { select: { title: true } }, member: { select: { id: true, firstName: true, lastName: true, photoUrl: true } } },
    }),
    eventsAndTrips(today, in14, { calendarAudiences: ["ALL", "STAFF", "PARENTS", "MONITORS"] }),
    activitySessions({}, now, in14),
    latestNotifications(user.id, 5),
    activityFeed(finance),
  ]);

  const registrations = [
    ...eventRegs.map((r) => ({ id: r.id, kind: "event" as const, status: r.status, at: r.createdAt, title: r.event.title, href: `/dashboard/events/${r.eventId}`, member: r.member })),
    ...tripRegs.map((r) => ({ id: r.id, kind: "trip" as const, status: r.status, at: r.createdAt, title: r.trip.title, href: `/dashboard/trips/${r.tripId}`, member: r.member })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);

  // Keep the agenda readable: events/trips first-class, sessions fill the rest.
  const agenda = sortAgenda([...agendaEvents, ...sortAgenda(agendaSessions, 10)], 9);

  return {
    finance,
    kpis: {
      members,
      children,
      parents,
      monitors,
      upcomingEvents,
      upcomingTrips,
      pendingRegistrations: pendingJoin + pendingEventRegs + pendingTripRegs,
      pendingJoin,
      revenueMonth: revenueMonth?._sum.amount ?? 0,
      pendingAmount: pending?.amount ?? 0,
      pendingInvoices: pending?.count ?? 0,
    },
    groups,
    trend,
    attendance,
    registrations,
    agenda,
    notifications,
    feed,
  };
}

/** Recent life of the association: new members, payments (finance only), session reports, announcements. */
async function activityFeed(finance: boolean): Promise<FeedItem[]> {
  const [members, payments, reports, announcements] = await Promise.all([
    db.member.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, firstName: true, lastName: true, type: true, createdAt: true } }),
    finance
      ? db.payment.findMany({ where: { status: "COMPLETED" }, orderBy: { paidAt: "desc" }, take: 5, select: { id: true, amount: true, paidAt: true, invoiceId: true, invoice: { select: { number: true, payer: { select: { firstName: true, lastName: true } } } } } })
      : Promise.resolve([]),
    db.activityReport.findMany({ orderBy: { date: "desc" }, take: 4, select: { id: true, date: true, summary: true, activityId: true, activity: { select: { title: true } } } }),
    db.announcement.findMany({ where: { publishedAt: { lte: new Date() } }, orderBy: { publishedAt: "desc" }, take: 3, select: { id: true, title: true, publishedAt: true } }),
  ]);
  return [
    ...members.map((m) => ({ id: `m-${m.id}`, kind: "member" as const, title: `${m.firstName} ${m.lastName}`, detail: m.type, at: m.createdAt, href: `/dashboard/members/${m.id}` })),
    ...payments.map((p) => ({ id: `p-${p.id}`, kind: "payment" as const, title: `${p.invoice.payer.firstName} ${p.invoice.payer.lastName}`, detail: p.invoice.number, amount: p.amount, at: p.paidAt, href: `/dashboard/finance/invoices/${p.invoiceId}` })),
    ...reports.map((r) => ({ id: `r-${r.id}`, kind: "report" as const, title: r.activity.title, detail: r.summary, at: r.date, href: `/dashboard/activities/${r.activityId}` })),
    ...announcements.map((a) => ({ id: `a-${a.id}`, kind: "announcement" as const, title: a.title, at: a.publishedAt, href: "/dashboard/announcements" })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 7);
}

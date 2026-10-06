import { db } from "@api/lib/db";
import { latestNotifications, outstanding, revenueExpenseTrend, startOfMonth } from "./common";

/** Finance-first dashboard (requires finance.read — checked by the caller). */
export async function accountantDashboard(userId: string) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  // Month/year to date: bounded at now so future-dated expenses (or payments) don't leak in.
  const monthToDate = { gte: monthStart, lte: now };
  const yearToDate = { gte: yearStart, lte: now };
  const billedStatus = { notIn: ["DRAFT", "CANCELLED"] };
  const overdueWhere = { OR: [{ status: "OVERDUE" }, { status: { in: ["PENDING", "PARTIALLY_PAID"] }, dueDate: { lt: now } }] };

  const [revenue, expenses, revenueYear, expensesYear, pending, overdue, paidCount, unpaidCount, trend, billedEvents, billedTrips, collected, recentPayments, overdueList, notifications] = await Promise.all([
    db.payment.aggregate({ _sum: { amount: true }, where: { status: "COMPLETED", paidAt: monthToDate } }),
    db.expense.aggregate({ _sum: { amount: true }, where: { date: monthToDate } }),
    db.payment.aggregate({ _sum: { amount: true }, where: { status: "COMPLETED", paidAt: yearToDate } }),
    db.expense.aggregate({ _sum: { amount: true }, where: { date: yearToDate } }),
    outstanding({}),
    outstanding(overdueWhere),
    db.invoice.count({ where: { status: "PAID" } }),
    db.invoice.count({ where: { status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] } } }),
    revenueExpenseTrend(6),
    db.invoice.groupBy({ by: ["eventId"], where: { eventId: { not: null }, status: billedStatus }, _sum: { amount: true } }),
    db.invoice.groupBy({ by: ["tripId"], where: { tripId: { not: null }, status: billedStatus }, _sum: { amount: true } }),
    db.payment.findMany({
      where: { status: "COMPLETED", invoice: { OR: [{ eventId: { not: null } }, { tripId: { not: null } }] } },
      select: { amount: true, invoice: { select: { eventId: true, tripId: true } } },
    }),
    db.payment.findMany({
      where: { status: "COMPLETED" },
      orderBy: { paidAt: "desc" },
      take: 6,
      select: { id: true, amount: true, method: true, paidAt: true, invoiceId: true, invoice: { select: { number: true, description: true, payer: { select: { firstName: true, lastName: true, photoUrl: true } } } } },
    }),
    db.invoice.findMany({
      where: overdueWhere,
      orderBy: { dueDate: "asc" },
      take: 6,
      select: { id: true, number: true, description: true, amount: true, dueDate: true, status: true, payments: { select: { amount: true, status: true } }, payer: { select: { firstName: true, lastName: true, phone: true } } },
    }),
    latestNotifications(userId, 4),
  ]);

  // Revenue by event/trip: billed (issued, non-cancelled invoices) vs collected (completed payments).
  const [events, trips] = await Promise.all([
    db.event.findMany({ where: { id: { in: billedEvents.map((b) => b.eventId!) } }, select: { id: true, title: true } }),
    db.trip.findMany({ where: { id: { in: billedTrips.map((b) => b.tripId!) } }, select: { id: true, title: true } }),
  ]);
  const collectedBy = new Map<string, number>();
  for (const p of collected) {
    const key = p.invoice.eventId ? `e:${p.invoice.eventId}` : `t:${p.invoice.tripId}`;
    collectedBy.set(key, (collectedBy.get(key) ?? 0) + p.amount);
  }
  const byItem = [
    ...billedEvents.map((b) => ({ key: `e:${b.eventId}`, kind: "event" as const, title: events.find((e) => e.id === b.eventId)?.title ?? "—", billed: b._sum.amount ?? 0 })),
    ...billedTrips.map((b) => ({ key: `t:${b.tripId}`, kind: "trip" as const, title: trips.find((t) => t.id === b.tripId)?.title ?? "—", billed: b._sum.amount ?? 0 })),
  ]
    .map((r) => ({ ...r, collected: collectedBy.get(r.key) ?? 0 }))
    .sort((a, b) => b.billed - a.billed)
    .slice(0, 6);

  const rev = revenue._sum.amount ?? 0;
  const exp = expenses._sum.amount ?? 0;
  return {
    kpis: {
      revenue: rev,
      expenses: exp,
      net: rev - exp,
      revenueYear: revenueYear._sum.amount ?? 0,
      netYear: (revenueYear._sum.amount ?? 0) - (expensesYear._sum.amount ?? 0),
      pending: pending.amount,
      pendingCount: pending.count,
      overdue: overdue.amount,
      overdueCount: overdue.count,
      paidCount,
      unpaidCount,
    },
    trend,
    byItem,
    recentPayments,
    overdueList,
    notifications,
  };
}

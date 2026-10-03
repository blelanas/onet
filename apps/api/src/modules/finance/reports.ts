import { db } from "@api/lib/db";
import { paidAmount } from "@api/lib/services/invoices";
import { monthKey, monthKeys, periodWhere, type Period } from "./period";

const OPEN_STATUSES = ["PENDING", "PARTIALLY_PAID", "OVERDUE"];

/**
 * Financial overview for a period. Revenue = COMPLETED payments (by paidAt), expenses by date.
 * Pending/overdue are a snapshot of what is still owed today (not period-bound).
 */
export async function financialReport(period: Period) {
  const paidAt = periodWhere(period);
  const date = periodWhere(period);
  const [payments, expenses, open] = await Promise.all([
    db.payment.findMany({
      where: { status: "COMPLETED", ...(paidAt ? { paidAt } : {}) },
      select: { amount: true, method: true, paidAt: true, invoice: { select: { eventId: true, tripId: true } } },
    }),
    db.expense.findMany({ where: date ? { date } : {}, select: { amount: true, date: true, category: true, eventId: true, tripId: true } }),
    db.invoice.findMany({
      where: { status: { in: OPEN_STATUSES } },
      orderBy: { dueDate: "asc" },
      include: { payments: { select: { amount: true, status: true } }, payer: { select: { firstName: true, lastName: true } }, child: { select: { firstName: true } } },
    }),
  ]);

  const revenue = payments.reduce((s, p) => s + p.amount, 0);
  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  const outstanding = open.map((i) => ({ ...i, remaining: Math.max(0, i.amount - paidAmount(i)) })).filter((i) => i.remaining > 0);
  const pending = outstanding.filter((i) => i.status !== "OVERDUE").reduce((s, i) => s + i.remaining, 0);
  const overdue = outstanding.filter((i) => i.status === "OVERDUE").reduce((s, i) => s + i.remaining, 0);

  // Monthly buckets: from the period start (or first movement) to its end (or today).
  const dates = [...payments.map((p) => p.paidAt), ...expenses.map((e) => e.date)];
  const from = period.from ?? (dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : new Date());
  const to = period.to ?? new Date();
  const months = monthKeys(from, to).map((key) => ({ key, revenue: 0, expenses: 0 }));
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const p of payments) {
    const m = byKey.get(monthKey(p.paidAt));
    if (m) m.revenue += p.amount;
  }
  for (const e of expenses) {
    const m = byKey.get(monthKey(e.date));
    if (m) m.expenses += e.amount;
  }

  // Per event / trip margins.
  const margins = new Map<string, { kind: "event" | "trip"; id: string; revenue: number; expenses: number }>();
  const bump = (kind: "event" | "trip", id: string | null, field: "revenue" | "expenses", amount: number) => {
    if (!id) return;
    const k = `${kind}:${id}`;
    const row = margins.get(k) ?? { kind, id, revenue: 0, expenses: 0 };
    row[field] += amount;
    margins.set(k, row);
  };
  for (const p of payments) {
    bump("event", p.invoice.eventId, "revenue", p.amount);
    bump("trip", p.invoice.tripId, "revenue", p.amount);
  }
  for (const e of expenses) {
    bump("event", e.eventId, "expenses", e.amount);
    bump("trip", e.tripId, "expenses", e.amount);
  }
  const ids = [...margins.values()];
  const [events, trips] = await Promise.all([
    db.event.findMany({ where: { id: { in: ids.filter((m) => m.kind === "event").map((m) => m.id) } }, select: { id: true, title: true } }),
    db.trip.findMany({ where: { id: { in: ids.filter((m) => m.kind === "trip").map((m) => m.id) } }, select: { id: true, title: true } }),
  ]);
  const titles = new Map([...events.map((e) => [`event:${e.id}`, e.title] as const), ...trips.map((t) => [`trip:${t.id}`, t.title] as const)]);
  const marginRows = ids
    .map((m) => ({ ...m, title: titles.get(`${m.kind}:${m.id}`) ?? "—", margin: m.revenue - m.expenses }))
    .sort((a, b) => b.revenue - a.revenue || b.expenses - a.expenses);

  const methods = new Map<string, number>();
  for (const p of payments) methods.set(p.method, (methods.get(p.method) ?? 0) + p.amount);
  const categories = new Map<string, number>();
  for (const e of expenses) categories.set(e.category, (categories.get(e.category) ?? 0) + e.amount);

  return {
    kpis: { revenue, expenses: spent, net: revenue - spent, pending, overdue, paymentsCount: payments.length, openCount: outstanding.length },
    months,
    margins: marginRows,
    methods: [...methods.entries()].map(([method, amount]) => ({ method, amount })).sort((a, b) => b.amount - a.amount),
    categories: [...categories.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
    outstanding: outstanding.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()),
  };
}
export type FinancialReport = Awaited<ReturnType<typeof financialReport>>;

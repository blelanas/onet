import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import { periodWhere, type Period } from "./period";

export type ExpenseFilters = { q?: string; category?: string; link?: string; period: Period; skip?: number; take?: number };

function expenseWhere(f: ExpenseFilters): Prisma.ExpenseWhereInput {
  const date = periodWhere(f.period);
  const [kind, id] = (f.link ?? "").split(":");
  const terms = f.q?.trim().split(/\s+/).slice(0, 4) ?? [];
  return {
    AND: [
      f.category ? { category: f.category } : {},
      date ? { date } : {},
      id && kind === "event" ? { eventId: id } : {},
      id && kind === "trip" ? { tripId: id } : {},
      ...terms.map((t) => ({ OR: [{ description: { contains: t } }, { supplier: { contains: t } }] })),
    ],
  };
}

export async function listExpenses(f: ExpenseFilters) {
  const where = expenseWhere(f);
  const [rows, total, byCategory] = await Promise.all([
    db.expense.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: f.skip,
      take: f.take,
      include: { event: { select: { id: true, title: true } }, trip: { select: { id: true, title: true } }, createdBy: { select: { name: true } } },
    }),
    db.expense.count({ where }),
    db.expense.groupBy({ by: ["category"], where, _sum: { amount: true }, _count: { _all: true } }),
  ]);
  const categories = byCategory.map((c) => ({ category: c.category, amount: c._sum.amount ?? 0, count: c._count._all })).sort((a, b) => b.amount - a.amount);
  return { rows, total, categories, sum: categories.reduce((s, c) => s + c.amount, 0) };
}
export type ExpenseRow = Awaited<ReturnType<typeof listExpenses>>["rows"][number];

export async function expenseLinkOptions() {
  const [events, trips] = await Promise.all([
    db.event.findMany({ orderBy: { startAt: "desc" }, select: { id: true, title: true }, take: 200 }),
    db.trip.findMany({ orderBy: { departAt: "desc" }, select: { id: true, title: true }, take: 200 }),
  ]);
  return { events, trips };
}

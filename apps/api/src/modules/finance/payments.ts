import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { invoiceScope } from "./access";
import { periodWhere, type Period } from "./period";

export type PaymentFilters = { q?: string; method?: string; status?: string; period: Period; skip?: number; take?: number };

async function paymentWhere(user: CurrentUser, f: PaymentFilters): Promise<Prisma.PaymentWhereInput> {
  const paidAt = periodWhere(f.period);
  const terms = f.q?.trim().split(/\s+/).slice(0, 4) ?? [];
  return {
    AND: [
      { invoice: await invoiceScope(user) },
      f.method ? { method: f.method } : {},
      f.status ? { status: f.status } : {},
      paidAt ? { paidAt } : {},
      ...terms.map((t) => ({
        OR: [
          { reference: { contains: t } },
          { invoice: { number: { contains: t } } },
          { invoice: { payer: { OR: [{ firstName: { contains: t } }, { lastName: { contains: t } }] } } },
        ],
      })),
    ],
  };
}

export async function listPayments(user: CurrentUser, f: PaymentFilters) {
  const where = await paymentWhere(user, f);
  const [rows, total, byMethod] = await Promise.all([
    db.payment.findMany({
      where,
      orderBy: { paidAt: "desc" },
      skip: f.skip,
      take: f.take,
      include: {
        invoice: { select: { id: true, number: true, description: true, payer: { select: { id: true, firstName: true, lastName: true, photoUrl: true } }, child: { select: { firstName: true } } } },
        recordedBy: { select: { name: true } },
      },
    }),
    db.payment.count({ where }),
    // Totals only count money actually received.
    db.payment.groupBy({ by: ["method"], where: { AND: [where, { status: "COMPLETED" }] }, _sum: { amount: true }, _count: { _all: true } }),
  ]);
  const methods = byMethod.map((m) => ({ method: m.method, amount: m._sum.amount ?? 0, count: m._count._all })).sort((a, b) => b.amount - a.amount);
  return { rows, total, methods, received: methods.reduce((s, m) => s + m.amount, 0) };
}
export type PaymentRow = Awaited<ReturnType<typeof listPayments>>["rows"][number];

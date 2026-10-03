import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import { AuthError } from "@api/lib/auth/guards";
import type { CurrentUser } from "@api/lib/auth/session";
import { paidAmount } from "@api/lib/services/invoices";
import { invoiceScope } from "./access";
import { periodWhere, type Period } from "./period";

export const INVOICE_TABS = ["all", "PENDING", "PARTIALLY_PAID", "OVERDUE", "PAID", "CANCELLED", "DRAFT"] as const;
export type InvoiceTab = (typeof INVOICE_TABS)[number];

export type InvoiceFilters = { q?: string; status?: string; link?: string; period: Period; skip?: number; take?: number };

const memberMini = { select: { id: true, firstName: true, lastName: true, photoUrl: true, userId: true } } as const;

function searchWhere(q?: string): Prisma.InvoiceWhereInput {
  if (!q) return {};
  const terms = q.trim().split(/\s+/).slice(0, 4);
  return {
    AND: terms.map((t) => ({
      OR: [
        { number: { contains: t } },
        { description: { contains: t } },
        { payer: { OR: [{ firstName: { contains: t } }, { lastName: { contains: t } }] } },
        { child: { OR: [{ firstName: { contains: t } }, { lastName: { contains: t } }] } },
      ],
    })),
  };
}

/** ?link=event:<id> | trip:<id> | activity:<id> */
export function linkWhere(link?: string): Prisma.InvoiceWhereInput {
  const [kind, id] = (link ?? "").split(":");
  if (!id) return {};
  if (kind === "event") return { eventId: id };
  if (kind === "trip") return { tripId: id };
  if (kind === "activity") return { activityId: id };
  return {};
}

async function baseWhere(user: CurrentUser, f: InvoiceFilters): Promise<Prisma.InvoiceWhereInput[]> {
  const issued = periodWhere(f.period);
  return [await invoiceScope(user), searchWhere(f.q), linkWhere(f.link), issued ? { issuedAt: issued } : {}];
}

export async function listInvoices(user: CurrentUser, f: InvoiceFilters) {
  const base = await baseWhere(user, f);
  const status = f.status && f.status !== "all" ? f.status : undefined;
  const where: Prisma.InvoiceWhereInput = { AND: [...base, status ? { status } : {}] };
  const [rows, total, grouped, billable, collected] = await Promise.all([
    db.invoice.findMany({
      where,
      orderBy: [{ issuedAt: "desc" }, { number: "desc" }],
      skip: f.skip,
      take: f.take,
      include: {
        payer: memberMini,
        child: memberMini,
        event: { select: { id: true, title: true } },
        trip: { select: { id: true, title: true } },
        activity: { select: { id: true, title: true } },
        payments: { select: { amount: true, status: true } },
      },
    }),
    db.invoice.count({ where }),
    db.invoice.groupBy({ by: ["status"], where: { AND: base }, _count: { _all: true } }),
    // Totals ignore drafts and cancelled invoices (nothing is due on them).
    db.invoice.aggregate({ where: { AND: [...base, status ? { status } : {}, { status: { notIn: ["DRAFT", "CANCELLED"] } }] }, _sum: { amount: true } }),
    db.payment.aggregate({
      where: { status: "COMPLETED", invoice: { AND: [...base, status ? { status } : {}, { status: { notIn: ["DRAFT", "CANCELLED"] } }] } },
      _sum: { amount: true },
    }),
  ]);
  const counts: Record<string, number> = { all: 0 };
  for (const g of grouped) {
    counts[g.status] = g._count._all;
    counts.all += g._count._all;
  }
  const billed = billable._sum.amount ?? 0;
  const paid = collected._sum.amount ?? 0;
  return {
    rows: rows.map((r) => ({ ...r, paid: paidAmount(r), remaining: Math.max(0, r.amount - paidAmount(r)) })),
    total,
    counts,
    totals: { billed, collected: paid, outstanding: Math.max(0, billed - paid) },
  };
}
export type InvoiceRow = Awaited<ReturnType<typeof listInvoices>>["rows"][number];

/** Parent view: every visible invoice (small set) with paid/remaining. */
export async function familyInvoices(user: CurrentUser) {
  const rows = await db.invoice.findMany({
    where: { AND: [await invoiceScope(user), { status: { not: "CANCELLED" } }] },
    orderBy: [{ dueDate: "asc" }],
    include: {
      child: memberMini,
      event: { select: { id: true, title: true, coverUrl: true } },
      trip: { select: { id: true, title: true, coverUrl: true } },
      activity: { select: { id: true, title: true } },
      payments: { select: { amount: true, status: true, paidAt: true } },
    },
  });
  return rows.map((r) => ({ ...r, paid: paidAmount(r), remaining: Math.max(0, r.amount - paidAmount(r)) }));
}
export type FamilyInvoice = Awaited<ReturnType<typeof familyInvoices>>[number];

export async function getInvoice(user: CurrentUser, id: string) {
  const inv = await db.invoice.findFirst({
    where: { AND: [{ id }, await invoiceScope(user)] },
    include: {
      payer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, address: true, city: true, membershipNumber: true, userId: true } },
      child: { select: { id: true, firstName: true, lastName: true, membershipNumber: true, group: { select: { name: true, color: true } } } },
      event: { select: { id: true, title: true, startAt: true } },
      trip: { select: { id: true, title: true, departAt: true } },
      activity: { select: { id: true, title: true } },
      payments: { orderBy: { paidAt: "desc" }, include: { recordedBy: { select: { name: true } } } },
      eventRegistration: { select: { id: true, status: true } },
      tripRegistration: { select: { id: true, status: true, documentsStatus: true } },
    },
  });
  if (!inv) throw new AuthError("NOT_FOUND");
  const paid = paidAmount(inv);
  return { ...inv, paid, remaining: Math.max(0, inv.amount - paid) };
}
export type InvoiceDetail = Awaited<ReturnType<typeof getInvoice>>;

// ── Settings ──
export type OrgProfile = { name?: string; fullName?: string; fullNameAr?: string; email?: string; phone?: string; address?: string };
export type BankInfo = { bank?: string; rib?: string; holder?: string; iban?: string; bic?: string };

async function setting<T>(key: string): Promise<T | null> {
  const s = await db.setting.findUnique({ where: { key } });
  if (!s) return null;
  try {
    return JSON.parse(s.value) as T;
  } catch {
    return null;
  }
}
export const orgProfile = () => setting<OrgProfile>("organization.profile");
export const bankInfo = () => setting<BankInfo>("payments.bank");

// ── Form options ──
export async function invoiceFormOptions() {
  const [payers, events, trips, activities] = await Promise.all([
    db.member.findMany({
      where: { type: { in: ["PARENT", "MEMBER"] } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        type: true,
        childrenLinks: { select: { child: { select: { id: true, firstName: true, lastName: true } } } },
      },
    }),
    db.event.findMany({ orderBy: { startAt: "desc" }, select: { id: true, title: true, price: true }, take: 200 }),
    db.trip.findMany({ orderBy: { departAt: "desc" }, select: { id: true, title: true, price: true }, take: 200 }),
    db.activity.findMany({ where: { status: { not: "CANCELLED" } }, orderBy: { title: "asc" }, select: { id: true, title: true }, take: 300 }),
  ]);
  return {
    payers: payers.map((p) => ({ id: p.id, name: `${p.lastName} ${p.firstName}`, type: p.type, children: p.childrenLinks.map((l) => ({ id: l.child.id, name: `${l.child.firstName} ${l.child.lastName}` })) })),
    events,
    trips,
    activities,
  };
}

/** Event/trip options for list filters. */
export async function linkFilterOptions() {
  const [events, trips] = await Promise.all([
    db.event.findMany({ where: { OR: [{ invoices: { some: {} } }, { expenses: { some: {} } }] }, orderBy: { startAt: "desc" }, select: { id: true, title: true } }),
    db.trip.findMany({ where: { OR: [{ invoices: { some: {} } }, { expenses: { some: {} } }] }, orderBy: { departAt: "desc" }, select: { id: true, title: true } }),
  ]);
  return { events, trips };
}

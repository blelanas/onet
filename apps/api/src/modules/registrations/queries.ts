import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { can } from "@api/lib/auth/guards";
import { myChildren } from "@api/lib/auth/scope";
import { startOfDay } from "@api/lib/dates";
import { ACTIVE_STATUSES, eligibility, type IneligibleReason, type RegKind, type RegTarget } from "./service";

/** Users who may see internal (non public) events/trips and participant lists. */
export function isStaffish(user: CurrentUser) {
  return can(user, "registrations.manage") || can(user, "events.manage") || can(user, "trips.manage") || user.roles.some((r) => ["monitor", "accountant", "admin", "super_admin"].includes(r));
}

/** Kids (and anyone without a registration/finance permission) never see prices. */
export function canSeeMoney(user: CurrentUser) {
  return can(user, "events.register") || can(user, "trips.register") || can(user, "registrations.manage") || can(user, "finance.read") || can(user, "events.manage") || can(user, "trips.manage");
}

const invoiceSelect = { id: true, number: true, status: true, amount: true } satisfies Prisma.InvoiceSelect;

export type FamilyEntry = {
  member: { id: string; firstName: string; lastName: string; photoUrl: string | null; dateOfBirth: Date | null; isSelf: boolean };
  registration: { id: string; status: string; parentConsent?: boolean; documentsStatus?: string; createdAt: Date; invoice: { id: string; number: string; status: string; amount: number } | null } | null;
  reason: IneligibleReason | null;
};

/** The members this user registers (own children + self when not a kid) with their state for a target. */
export async function familyEntries(user: CurrentUser, target: RegTarget): Promise<FamilyEntry[]> {
  const canRegister = can(user, target.kind === "event" ? "events.register" : "trips.register") || can(user, "registrations.manage");
  if (!canRegister || !user.memberId) return [];
  const kids = await myChildren(user);
  const people = kids.map((k) => ({ ...k, isSelf: false }));
  // Staff register other people from the participants tab, not from the family panel.
  if (!user.roles.includes("kid") && !can(user, "registrations.manage")) {
    const self = await db.member.findUnique({ where: { id: user.memberId } });
    // Parents register their children; they appear themselves only for public (non-children) events.
    if (self && (target.kind === "event" || !kids.length)) people.push({ ...self, group: null, isSelf: true });
  }
  if (!people.length) return [];
  const ids = people.map((p) => p.id);
  const regs =
    target.kind === "event"
      ? await db.eventRegistration.findMany({ where: { eventId: target.id, memberId: { in: ids } }, include: { invoice: { select: invoiceSelect } } })
      : await db.tripRegistration.findMany({ where: { tripId: target.id, memberId: { in: ids } }, include: { invoice: { select: invoiceSelect } } });
  return people.map((p) => {
    const r = regs.find((x) => x.memberId === p.id) ?? null;
    return {
      member: { id: p.id, firstName: p.firstName, lastName: p.lastName, photoUrl: p.photoUrl, dateOfBirth: p.dateOfBirth, isSelf: p.isSelf },
      registration: r && {
        id: r.id,
        status: r.status,
        createdAt: r.createdAt,
        invoice: r.invoice,
        ...("parentConsent" in r ? { parentConsent: r.parentConsent, documentsStatus: r.documentsStatus } : {}),
      },
      reason: eligibility(target, p, r?.status ?? null),
    };
  });
}

/** Registration counters for a target. */
export async function registrationStats(kind: RegKind, id: string) {
  const rows =
    kind === "event"
      ? await db.eventRegistration.groupBy({ by: ["status"], where: { eventId: id }, _count: true })
      : await db.tripRegistration.groupBy({ by: ["status"], where: { tripId: id }, _count: true });
  const by = Object.fromEntries(rows.map((r) => [r.status, r._count])) as Record<string, number>;
  return { confirmed: by.CONFIRMED ?? 0, pending: by.PENDING ?? 0, waitlist: by.WAITLIST ?? 0, cancelled: by.CANCELLED ?? 0, active: ACTIVE_STATUSES.reduce((s, k) => s + (by[k] ?? 0), 0) };
}

/** Saved roll-call for an event/trip day: memberId → status. */
export async function rollCall(contextKey: string, day: Date) {
  const rows = await db.attendance.findMany({ where: { contextKey, date: startOfDay(day) }, select: { memberId: true, status: true } });
  return Object.fromEntries(rows.map((r) => [r.memberId, r.status])) as Record<string, string>;
}

const memberSelect = {
  id: true,
  firstName: true,
  lastName: true,
  photoUrl: true,
  dateOfBirth: true,
  membershipNumber: true,
  medicalNotes: true,
  group: { select: { name: true, color: true } },
  parentLinks: { orderBy: { isPrimary: "desc" }, take: 2, select: { parent: { select: { firstName: true, lastName: true, phone: true } } } },
} satisfies Prisma.MemberSelect;

export async function eventParticipants(eventId: string) {
  return db.eventRegistration.findMany({
    where: { eventId },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    include: { member: { select: memberSelect }, registeredBy: { select: { name: true } }, invoice: { select: invoiceSelect } },
  });
}

export async function tripParticipants(tripId: string) {
  return db.tripRegistration.findMany({
    where: { tripId },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    include: { member: { select: memberSelect }, registeredBy: { select: { name: true } }, invoice: { select: invoiceSelect } },
  });
}
export type Participant = Awaited<ReturnType<typeof tripParticipants>>[number] | Awaited<ReturnType<typeof eventParticipants>>[number];

/** Members staff can add manually (not already actively registered). */
export async function addableMembers(kind: RegKind, targetId: string) {
  const taken =
    kind === "event"
      ? await db.eventRegistration.findMany({ where: { eventId: targetId, status: { not: "CANCELLED" } }, select: { memberId: true } })
      : await db.tripRegistration.findMany({ where: { tripId: targetId, status: { not: "CANCELLED" } }, select: { memberId: true } });
  return db.member.findMany({
    where: { id: { notIn: taken.map((x) => x.memberId) }, membershipStatus: { not: "SUSPENDED" }, type: kind === "trip" ? { in: ["CHILD", "MEMBER"] } : undefined },
    orderBy: [{ type: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, type: true, dateOfBirth: true },
  });
}

/** Payment state derived from the invoice (for filters and badges). */
export function paymentState(inv: { status: string } | null | undefined): "FREE" | "PAID" | "UNPAID" | "CANCELLED" {
  if (!inv) return "FREE";
  if (inv.status === "PAID") return "PAID";
  if (inv.status === "CANCELLED") return "CANCELLED";
  return "UNPAID";
}

export type RegFilters = { kind?: string; status?: string; target?: string; payment?: string; q?: string; scope?: string };

const UNPAID_INVOICE_STATUSES = ["PENDING", "OVERDUE", "PARTIALLY_PAID", "DRAFT"];

/**
 * DB filters for the registrations list (null = that kind is filtered out). Staff see everything;
 * families see the registrations of their children and their own.
 */
async function registrationWheres(user: CurrentUser, f: RegFilters) {
  const staff = can(user, "registrations.manage");
  let memberWhere: Prisma.MemberWhereInput = {};
  if (!staff) {
    const ids = (await myChildren(user)).map((c) => c.id);
    if (user.memberId) ids.push(user.memberId);
    memberWhere = { id: { in: ids } };
  }
  if (f.q) {
    const terms = f.q.trim().split(/\s+/).slice(0, 3);
    memberWhere = { AND: [memberWhere, ...terms.map((t) => ({ OR: [{ firstName: { contains: t } }, { lastName: { contains: t } }, { firstNameAr: { contains: t } }, { lastNameAr: { contains: t } }] }))] };
  }
  const [targetKind, targetId] = (f.target ?? "").split(":");
  const payWhere: Prisma.EventRegistrationWhereInput =
    f.payment === "PAID" ? { invoice: { status: "PAID" } } : f.payment === "UNPAID" ? { invoice: { status: { in: UNPAID_INVOICE_STATUSES } } } : f.payment === "FREE" ? { invoiceId: null } : {};
  const scopeWhere = f.scope === "past" ? "past" : f.scope === "all" ? "all" : "upcoming";
  const now = startOfDay();
  const base = { member: memberWhere, ...(f.status ? { status: f.status } : {}), ...payWhere };
  const event: Prisma.EventRegistrationWhereInput | null =
    f.kind === "trip" || (targetKind && targetKind !== "event")
      ? null
      : { ...base, ...(targetId ? { eventId: targetId } : {}), event: scopeWhere === "all" ? {} : scopeWhere === "past" ? { endAt: { lt: now } } : { endAt: { gte: now } } };
  const trip: Prisma.TripRegistrationWhereInput | null =
    f.kind === "event" || (targetKind && targetKind !== "trip")
      ? null
      : { ...(base as Prisma.TripRegistrationWhereInput), ...(targetId ? { tripId: targetId } : {}), trip: scopeWhere === "all" ? {} : scopeWhere === "past" ? { returnAt: { lt: now } } : { returnAt: { gte: now } } };
  return { staff, event, trip };
}

/**
 * Event + trip registrations, merged and sorted (staff: newest first; families: soonest first).
 * `take` limits each kind at the DB: newest-first, the first N merged rows are always within the
 * first N of each kind, so `take = page * pageSize` is enough to slice a page.
 */
export async function listRegistrations(user: CurrentUser, f: RegFilters, opts: { take?: number } = {}) {
  const { staff, event, trip } = await registrationWheres(user, f);
  const include = {
    member: { select: { id: true, firstName: true, lastName: true, photoUrl: true, dateOfBirth: true } },
    registeredBy: { select: { name: true } },
    invoice: { select: invoiceSelect },
  } as const;
  const orderBy = [{ createdAt: "desc" as const }, { id: "desc" as const }];
  const [events, trips] = await Promise.all([
    event ? db.eventRegistration.findMany({ where: event, include: { ...include, event: { select: { id: true, title: true, startAt: true, category: true, price: true } } }, orderBy, take: opts.take }) : [],
    trip ? db.tripRegistration.findMany({ where: trip, include: { ...include, trip: { select: { id: true, title: true, departAt: true, category: true, price: true, destination: true } } }, orderBy, take: opts.take }) : [],
  ]);
  const rows = [
    ...events.map((r) => ({ kind: "event" as const, id: r.id, status: r.status, createdAt: r.createdAt, member: r.member, registeredBy: r.registeredBy, invoice: r.invoice, target: { id: r.event.id, title: r.event.title, date: r.event.startAt, category: r.event.category, price: r.event.price }, parentConsent: null as boolean | null, documentsStatus: null as string | null })),
    ...trips.map((r) => ({ kind: "trip" as const, id: r.id, status: r.status, createdAt: r.createdAt, member: r.member, registeredBy: r.registeredBy, invoice: r.invoice, target: { id: r.trip.id, title: r.trip.title, date: r.trip.departAt, category: r.trip.category, price: r.trip.price }, parentConsent: r.parentConsent, documentsStatus: r.documentsStatus })),
  ];
  // Staff: newest registrations first. Families: soonest event first.
  rows.sort((a, b) => (staff ? b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id) : a.target.date.getTime() - b.target.date.getTime()));
  return rows;
}

/** Total + KPIs for the registrations console, computed in the DB over every matching row. */
export async function registrationTotals(user: CurrentUser, f: RegFilters) {
  const { event, trip } = await registrationWheres(user, f);
  const live = { status: { not: "CANCELLED" } };
  const unpaidInvoice = { invoice: { status: { in: UNPAID_INVOICE_STATUSES } } };
  const count = async (...extra: Prisma.EventRegistrationWhereInput[]) => {
    const [e, t] = await Promise.all([
      event ? db.eventRegistration.count({ where: { AND: [event, ...extra] } }) : 0,
      trip ? db.tripRegistration.count({ where: { AND: [trip, ...(extra as Prisma.TripRegistrationWhereInput[])] } }) : 0,
    ]);
    return e + t;
  };
  const owners: Prisma.InvoiceWhereInput[] = [
    ...(event ? [{ eventRegistration: { is: { AND: [event, live] } } }] : []),
    ...(trip ? [{ tripRegistration: { is: { AND: [trip, live] } } }] : []),
  ];
  const [total, active, pending, waitlist, unpaid, unpaidSum] = await Promise.all([
    count(),
    count(live),
    count({ status: "PENDING" }),
    count({ status: "WAITLIST" }),
    count(live, unpaidInvoice),
    owners.length ? db.invoice.aggregate({ where: { status: { in: UNPAID_INVOICE_STATUSES }, OR: owners }, _sum: { amount: true } }) : null,
  ]);
  return { total, kpi: { active, pending, waitlist, unpaid, unpaidAmount: unpaidSum?._sum.amount ?? 0 } };
}
export type RegistrationRow = Awaited<ReturnType<typeof listRegistrations>>[number];

/** Options for the "event / trip" filter. */
export async function targetOptions() {
  const since = new Date(Date.now() - 120 * 86400_000);
  const [events, trips] = await Promise.all([
    db.event.findMany({ where: { startAt: { gte: since } }, orderBy: { startAt: "asc" }, select: { id: true, title: true } }),
    db.trip.findMany({ where: { departAt: { gte: since } }, orderBy: { departAt: "asc" }, select: { id: true, title: true } }),
  ]);
  return { events, trips };
}

/** Zeroes prices for users who must not see money (kids…): the UI hides them, and the API must not send them. */
export function hidePrice<T extends { price: number }>(row: T, showMoney: boolean): T {
  return showMoney ? row : { ...row, price: 0, ...("requiresPayment" in row ? { requiresPayment: false } : {}) };
}

/** Invoice reduced to its status when the viewer may not see amounts. */
export function hideInvoiceMoney<T extends { invoice: { id: string; number: string; status: string; amount: number } | null }>(row: T, showMoney: boolean): T {
  return showMoney || !row.invoice ? row : { ...row, invoice: { ...row.invoice, number: "", amount: 0 } };
}

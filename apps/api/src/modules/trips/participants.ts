import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import { ageFrom } from "@onet/shared";
import { ACTIVE_STATUSES } from "@api/modules/registrations/service";

const participantInclude = {
  member: {
    select: {
      id: true,
      type: true,
      firstName: true,
      lastName: true,
      photoUrl: true,
      dateOfBirth: true,
      phone: true,
      membershipNumber: true,
      medicalNotes: true,
      group: { select: { name: true, color: true } },
      parentLinks: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 1,
        select: { relation: true, parent: { select: { firstName: true, lastName: true, phone: true } } },
      },
    },
  },
  registeredBy: { select: { name: true } },
  invoice: { select: { id: true, number: true, status: true, amount: true, payments: { select: { amount: true, method: true, status: true, paidAt: true } } } },
} satisfies Prisma.TripRegistrationInclude;

type RegRow = Prisma.TripRegistrationGetPayload<{ include: typeof participantInclude }>;

/** One participant as trip managers and accountants see it: who, how to reach them, what is paid. */
function toParticipant(r: RegRow) {
  const m = r.member;
  const guardian = m.parentLinks[0] ?? null;
  const inv = r.invoice;
  const live = !!inv && inv.status !== "CANCELLED";
  const done = inv?.payments.filter((p) => p.status === "COMPLETED") ?? [];
  const paid = done.reduce((s, p) => s + p.amount, 0);
  const amountDue = live ? inv.amount : 0;
  return {
    id: r.id,
    status: r.status,
    parentConsent: r.parentConsent,
    documentsStatus: r.documentsStatus,
    notes: r.notes,
    createdAt: r.createdAt,
    registeredBy: r.registeredBy?.name ?? null,
    member: { id: m.id, firstName: m.firstName, lastName: m.lastName, photoUrl: m.photoUrl, membershipNumber: m.membershipNumber, medicalNotes: m.medicalNotes, group: m.group, dateOfBirth: m.dateOfBirth },
    /** kid = CHILD member; member = an adult member / monitor taking part. */
    type: m.type === "CHILD" ? ("kid" as const) : ("member" as const),
    age: ageFrom(m.dateOfBirth),
    /** The participant's own phone, else the primary guardian's. */
    phone: m.phone ?? guardian?.parent.phone ?? null,
    guardian: guardian ? { name: `${guardian.parent.firstName} ${guardian.parent.lastName}`, phone: guardian.parent.phone, relation: guardian.relation } : null,
    invoice: inv ? { id: inv.id, number: inv.number, status: inv.status } : null,
    amountDue,
    paid,
    remaining: live ? Math.max(0, inv.amount - paid) : 0,
    methods: [...new Set(done.map((p) => p.method))],
    payments: done.map((p) => ({ amount: p.amount, method: p.method, paidAt: p.paidAt })),
  };
}
export type TripParticipant = ReturnType<typeof toParticipant>;

export type TripTotals = {
  participants: number;
  expected: number;
  collected: number;
  outstanding: number;
  byMethod: { method: string; amount: number }[];
  waitlist: number;
  cancelled: number;
  /** Money already paid on cancelled registrations (refund to handle by the accountant). */
  refundDue: number;
};

/** Totals over the active list (PENDING + CONFIRMED). */
export function tripTotals(rows: TripParticipant[]): TripTotals {
  const active = rows.filter((r) => ACTIVE_STATUSES.includes(r.status));
  const byMethod = new Map<string, number>();
  for (const r of active) for (const p of r.payments) byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amount);
  return {
    participants: active.length,
    expected: active.reduce((s, r) => s + r.amountDue, 0),
    collected: active.reduce((s, r) => s + r.paid, 0),
    outstanding: active.reduce((s, r) => s + r.remaining, 0),
    byMethod: [...byMethod.entries()].map(([method, amount]) => ({ method, amount })).sort((a, b) => b.amount - a.amount),
    waitlist: rows.filter((r) => r.status === "WAITLIST").length,
    cancelled: rows.filter((r) => r.status === "CANCELLED").length,
    refundDue: rows.filter((r) => r.status === "CANCELLED").reduce((s, r) => s + r.paid, 0),
  };
}

const STATUS_ORDER: Record<string, number> = { CONFIRMED: 0, PENDING: 1, WAITLIST: 2, CANCELLED: 3 };

/** Every registration of the trip (active first, then waitlist, then cancelled), alphabetical. */
export async function tripParticipantRows(tripId: string, client: Prisma.TransactionClient | typeof db = db) {
  const regs = await client.tripRegistration.findMany({ where: { tripId }, include: participantInclude });
  return regs
    .map(toParticipant)
    .sort((a, b) => {
      const sa = ACTIVE_STATUSES.includes(a.status) ? 0 : (STATUS_ORDER[a.status] ?? 9);
      const sb = ACTIVE_STATUSES.includes(b.status) ? 0 : (STATUS_ORDER[b.status] ?? 9);
      return sa - sb || a.member.lastName.localeCompare(b.member.lastName) || a.member.firstName.localeCompare(b.member.firstName);
    });
}

/** Members a manager may add: children and adult members not already on the list (search by name / number / phone). */
export async function participantCandidates(tripId: string, q?: string) {
  const taken = await db.tripRegistration.findMany({ where: { tripId, status: { not: "CANCELLED" } }, select: { memberId: true } });
  const terms = (q ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 3);
  const rows = await db.member.findMany({
    where: {
      id: { notIn: taken.map((t) => t.memberId) },
      type: { in: ["CHILD", "MEMBER", "MONITOR"] },
      // Only people who can be added (suspended, inactive or pending ones are refused).
      membershipStatus: "ACTIVE",
      AND: terms.map((t) => ({
        OR: [{ firstName: { contains: t } }, { lastName: { contains: t } }, { firstNameAr: { contains: t } }, { lastNameAr: { contains: t } }, { membershipNumber: { contains: t } }, { phone: { contains: t } }],
      })),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 30,
    select: {
      id: true,
      type: true,
      firstName: true,
      lastName: true,
      photoUrl: true,
      dateOfBirth: true,
      group: { select: { name: true } },
      parentLinks: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }], take: 1, select: { parent: { select: { firstName: true, lastName: true } } } },
    },
  });
  return rows.map((m) => ({
    id: m.id,
    type: m.type === "CHILD" ? ("kid" as const) : ("member" as const),
    firstName: m.firstName,
    lastName: m.lastName,
    photoUrl: m.photoUrl,
    age: ageFrom(m.dateOfBirth),
    group: m.group?.name ?? null,
    guardian: m.parentLinks[0] ? `${m.parentLinks[0].parent.firstName} ${m.parentLinks[0].parent.lastName}` : null,
  }));
}

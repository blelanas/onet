import { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import { invitationState, normalizePhone } from "./lib";

/** LIKE pattern matching a phone that contains these digits in order, whatever the separators between them. */
const digitsPattern = (digits: string) => `%${digits.split("").join("%")}%`;

/** Tab counters of the Approvals page (also the nav badge for `pending`). */
export async function approvalCounts() {
  const now = new Date();
  const [pending, invitations, preapproved] = await Promise.all([
    db.user.count({ where: { status: "PENDING" } }),
    // Usable links only. Prisma can't compare two columns ("uses" < "maxUses"), hence the raw count.
    db.$queryRaw<{ n: number | bigint }[]>`SELECT COUNT(*) AS "n" FROM "Invitation" WHERE "revokedAt" IS NULL AND "expiresAt" > ${now} AND "uses" < "maxUses"`.then((r) => Number(r[0]?.n ?? 0)),
    db.preapprovedPerson.count({ where: { usedById: null } }),
  ]);
  return { pending, invitations, preapproved };
}

/**
 * PENDING sign-ups, oldest first, with what may help an approver recognise them: the invitation
 * label and existing Member records sharing their e-mail or phone.
 */
export async function listPendingUsers(skip: number, take: number) {
  const where = { status: "PENDING" };
  const [rows, total] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: "asc" }, skip, take, select: { id: true, name: true, email: true, phone: true, requestedRole: true, invitationId: true, createdAt: true } }),
    db.user.count({ where }),
  ]);
  const invIds = [...new Set(rows.map((r) => r.invitationId).filter((x): x is string => !!x))];
  const invitations = invIds.length ? await db.invitation.findMany({ where: { id: { in: invIds } }, select: { id: true, label: true } }) : [];
  const labelOf = new Map(invitations.map((i) => [i.id, i.label]));

  // Members already known with the same e-mail (any case) or phone (compared normalized). Member
  // phones are free text ("+216 22 345 678"): the database narrows them down on the last 8 digits (at
  // most one page of pending phones, any separators between digits), then normalizePhone() decides.
  const tails = [...new Set(rows.map((r) => normalizePhone(r.phone)?.slice(-8)).filter((x): x is string => !!x))];
  const matches = rows.length
    ? await db.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Member" WHERE lower("email") IN (${Prisma.join(rows.map((r) => r.email.toLowerCase()))})${
        tails.length ? Prisma.sql` OR ("phone" IS NOT NULL AND (${Prisma.join(tails.map((t) => Prisma.sql`"phone" LIKE ${digitsPattern(t)}`), " OR ")}))` : Prisma.empty
      }`
    : [];
  const candidates = matches.length
    ? await db.member.findMany({
        where: { id: { in: matches.map((m) => m.id) } },
        orderBy: { createdAt: "asc" },
        select: { id: true, firstName: true, lastName: true, type: true, email: true, phone: true, membershipNumber: true, userId: true },
      })
    : [];
  return {
    total,
    rows: rows.map((r) => {
      const p = normalizePhone(r.phone);
      const known = candidates
        .filter((m) => (m.email && m.email.toLowerCase() === r.email) || (p && normalizePhone(m.phone) === p))
        .slice(0, 3)
        .map((m) => ({ id: m.id, name: `${m.firstName} ${m.lastName}`, type: m.type, membershipNumber: m.membershipNumber, hasAccount: !!m.userId }));
      return { ...r, invitationLabel: r.invitationId ? (labelOf.get(r.invitationId) ?? null) : null, known };
    }),
  };
}

export async function listInvitations(skip: number, take: number) {
  const [rows, total] = await Promise.all([
    db.invitation.findMany({ orderBy: { createdAt: "desc" }, skip, take, include: { createdBy: { select: { name: true } } } }),
    db.invitation.count(),
  ]);
  const now = new Date();
  return {
    total,
    rows: rows.map(({ tokenHash: _hash, createdBy, ...r }) => ({ ...r, createdByName: createdBy?.name ?? null, state: invitationState(r, now) })),
  };
}

export async function listPreapproved(filter: "all" | "waiting" | "used", skip: number, take: number) {
  const where = filter === "waiting" ? { usedById: null } : filter === "used" ? { usedById: { not: null } } : {};
  const [rows, total] = await Promise.all([
    db.preapprovedPerson.findMany({
      where,
      orderBy: [{ usedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
      skip,
      take,
      include: { usedBy: { select: { id: true, name: true, email: true } }, createdBy: { select: { name: true } } },
    }),
    db.preapprovedPerson.count({ where }),
  ]);
  return { rows, total };
}

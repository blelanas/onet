import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import { AuthError, can } from "@/lib/auth/guards";
import { myChildren } from "@/lib/auth/scope";
import { ACTIVE_STATUSES } from "@/server/registrations/service";
import { isStaffish } from "@/server/registrations/queries";

export type TripTab = "upcoming" | "past" | "drafts" | "supervised";
export type TripFilters = { tab: TripTab; category?: string; q?: string; skip?: number; take?: number };

function visibilityWhere(user: CurrentUser): Prisma.TripWhereInput {
  return isStaffish(user) ? {} : { isPublic: true };
}

function tabWhere(user: CurrentUser, tab: TripTab): Prisma.TripWhereInput {
  const now = new Date();
  if (tab === "drafts" && can(user, "trips.manage")) return { status: "DRAFT" };
  if (tab === "supervised") return { monitors: { some: { memberId: user.memberId ?? "__none__" } } };
  if (tab === "past") return { status: { not: "DRAFT" }, returnAt: { lt: now } };
  return { status: { not: "DRAFT" }, returnAt: { gte: now } };
}

export async function listTrips(user: CurrentUser, f: TripFilters) {
  const where: Prisma.TripWhereInput = {
    AND: [
      visibilityWhere(user),
      tabWhere(user, f.tab),
      f.category ? { category: f.category } : {},
      f.q ? { OR: [{ title: { contains: f.q } }, { destination: { contains: f.q } }, { description: { contains: f.q } }] } : {},
    ],
  };
  const [rows, total] = await Promise.all([
    db.trip.findMany({
      where,
      orderBy: { departAt: f.tab === "past" ? "desc" : "asc" },
      skip: f.skip,
      take: f.take,
      include: {
        _count: { select: { registrations: { where: { status: { in: ACTIVE_STATUSES } } } } },
        monitors: { select: { member: { select: { id: true, firstName: true, lastName: true, photoUrl: true } } } },
      },
    }),
    db.trip.count({ where }),
  ]);
  return { rows, total };
}

export async function tripTabCounts(user: CurrentUser) {
  const v = visibilityWhere(user);
  const [upcoming, past, drafts, supervised] = await Promise.all([
    db.trip.count({ where: { ...v, ...tabWhere(user, "upcoming") } }),
    db.trip.count({ where: { ...v, ...tabWhere(user, "past") } }),
    can(user, "trips.manage") ? db.trip.count({ where: { status: "DRAFT" } }) : 0,
    user.memberId ? db.tripMonitor.count({ where: { memberId: user.memberId } }) : 0,
  ]);
  return { upcoming, past, drafts, supervised };
}

export async function familyTripRegistrations(user: CurrentUser, tripIds: string[]) {
  const out: Record<string, { firstName: string; lastName: string; photoUrl: string | null; status: string }[]> = {};
  if (!user.memberId || !tripIds.length) return out;
  const ids = [user.memberId, ...(await myChildren(user)).map((c) => c.id)];
  const regs = await db.tripRegistration.findMany({
    where: { tripId: { in: tripIds }, memberId: { in: ids }, status: { not: "CANCELLED" } },
    select: { tripId: true, status: true, member: { select: { firstName: true, lastName: true, photoUrl: true } } },
  });
  for (const r of regs) (out[r.tripId] ??= []).push({ ...r.member, status: r.status });
  return out;
}

export async function getTrip(user: CurrentUser, id: string) {
  const t = await db.trip.findUnique({
    where: { id },
    include: {
      monitors: { include: { member: { select: { id: true, firstName: true, lastName: true, photoUrl: true, phone: true } } } },
      _count: { select: { registrations: { where: { status: { in: ACTIVE_STATUSES } } } } },
    },
  });
  if (!t) throw new AuthError("NOT_FOUND");
  if (t.status === "DRAFT" && !can(user, "trips.manage")) throw new AuthError("NOT_FOUND");
  if (!t.isPublic && !isStaffish(user)) throw new AuthError("NOT_FOUND");
  return t;
}

export function isTripMonitor(user: CurrentUser, trip: { monitors: { memberId: string }[] }) {
  return !!user.memberId && trip.monitors.some((m) => m.memberId === user.memberId);
}

export async function getTripForEdit(id: string) {
  const t = await db.trip.findUnique({ where: { id }, include: { monitors: { select: { memberId: true } } } });
  if (!t) throw new AuthError("NOT_FOUND");
  return t;
}

export async function monitorOptions() {
  return db.member.findMany({
    where: { type: { in: ["MONITOR", "STAFF"] }, membershipStatus: "ACTIVE" },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, photoUrl: true },
  });
}

/** Program text "08:00 | Départ" (one step per line) → steps. */
export function parseProgram(program: string | null) {
  return (program ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf("|");
      return i >= 0 ? { time: l.slice(0, i).trim(), label: l.slice(i + 1).trim() } : { time: "", label: l };
    });
}

export function tripDocumentCount(tripId: string) {
  return db.document.count({ where: { entityType: "TRIP", entityId: tripId } });
}

export function parseLines(text: string | null) {
  return (text ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

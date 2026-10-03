import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import { AuthError, can } from "@/lib/auth/guards";
import { myChildren } from "@/lib/auth/scope";
import { ACTIVE_STATUSES } from "@/server/registrations/service";
import { isStaffish } from "@/server/registrations/queries";

export type EventTab = "upcoming" | "past" | "drafts";
export type EventFilters = { tab: EventTab; category?: string; q?: string; skip?: number; take?: number };

function visibilityWhere(user: CurrentUser): Prisma.EventWhereInput {
  return isStaffish(user) ? {} : { isPublic: true };
}

export async function listEvents(user: CurrentUser, f: EventFilters) {
  const now = new Date();
  const manage = can(user, "events.manage");
  const tabWhere: Prisma.EventWhereInput =
    f.tab === "drafts" && manage ? { status: "DRAFT" } : f.tab === "past" ? { status: { not: "DRAFT" }, endAt: { lt: now } } : { status: { not: "DRAFT" }, endAt: { gte: now } };
  const where: Prisma.EventWhereInput = {
    AND: [
      visibilityWhere(user),
      tabWhere,
      f.category ? { category: f.category } : {},
      f.q ? { OR: [{ title: { contains: f.q } }, { location: { contains: f.q } }, { description: { contains: f.q } }] } : {},
    ],
  };
  const [rows, total] = await Promise.all([
    db.event.findMany({
      where,
      orderBy: { startAt: f.tab === "past" ? "desc" : "asc" },
      skip: f.skip,
      take: f.take,
      include: { _count: { select: { registrations: { where: { status: { in: ACTIVE_STATUSES } } } } } },
    }),
    db.event.count({ where }),
  ]);
  return { rows, total };
}

export async function eventTabCounts(user: CurrentUser) {
  const now = new Date();
  const v = visibilityWhere(user);
  const [upcoming, past, drafts] = await Promise.all([
    db.event.count({ where: { ...v, status: { not: "DRAFT" }, endAt: { gte: now } } }),
    db.event.count({ where: { ...v, status: { not: "DRAFT" }, endAt: { lt: now } } }),
    can(user, "events.manage") ? db.event.count({ where: { status: "DRAFT" } }) : 0,
  ]);
  return { upcoming, past, drafts };
}

/** For family users: which of their members are registered to which of these events. */
export async function familyRegistrationsFor(user: CurrentUser, eventIds: string[]) {
  if (!user.memberId || !eventIds.length) return {} as Record<string, { firstName: string; lastName: string; photoUrl: string | null; status: string }[]>;
  const ids = [user.memberId, ...(await myChildren(user)).map((c) => c.id)];
  const regs = await db.eventRegistration.findMany({
    where: { eventId: { in: eventIds }, memberId: { in: ids }, status: { not: "CANCELLED" } },
    select: { eventId: true, status: true, member: { select: { firstName: true, lastName: true, photoUrl: true } } },
  });
  const out: Record<string, { firstName: string; lastName: string; photoUrl: string | null; status: string }[]> = {};
  for (const r of regs) (out[r.eventId] ??= []).push({ ...r.member, status: r.status });
  return out;
}

export async function getEvent(user: CurrentUser, id: string) {
  const e = await db.event.findUnique({
    where: { id },
    include: {
      activities: { select: { id: true, title: true, category: true, coverUrl: true, startTime: true, location: true } },
      _count: { select: { registrations: { where: { status: { in: ACTIVE_STATUSES } } } } },
    },
  });
  if (!e) throw new AuthError("NOT_FOUND");
  if (e.status === "DRAFT" && !can(user, "events.manage")) throw new AuthError("NOT_FOUND");
  if (!e.isPublic && !isStaffish(user)) throw new AuthError("NOT_FOUND");
  return e;
}

export async function getEventForEdit(id: string) {
  const e = await db.event.findUnique({ where: { id } });
  if (!e) throw new AuthError("NOT_FOUND");
  return e;
}

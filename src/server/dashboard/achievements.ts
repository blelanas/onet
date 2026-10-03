import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import { AuthError, hasRole } from "@/lib/auth/guards";
import { myChildren } from "@/lib/auth/scope";
import { kidBadges } from "./kid";

/**
 * Resolves whose achievements to show: a kid sees their own; a parent sees one of their
 * children (`?child=`, guardianship enforced). Anyone else is refused.
 */
export async function resolveAchievementsMember(user: CurrentUser, childParam?: string) {
  const kids = hasRole(user, "parent") ? await myChildren(user) : [];
  if (childParam) {
    if (childParam === user.memberId && hasRole(user, "kid")) return { memberId: childParam, kids, viewingChild: false };
    if (kids.some((k) => k.id === childParam)) return { memberId: childParam, kids, viewingChild: true };
    throw new AuthError("FORBIDDEN");
  }
  if (hasRole(user, "kid") && user.memberId) return { memberId: user.memberId, kids, viewingChild: false };
  if (kids.length) return { memberId: kids[0].id, kids, viewingChild: true };
  if (hasRole(user, "parent")) return { memberId: null, kids, viewingChild: true };
  throw new AuthError("FORBIDDEN");
}

export type HistoryItem = { id: string; kind: "badge" | "trip" | "event"; title: string; at: Date; color: string; icon?: string; points?: number; href?: string };

export async function achievements(memberId: string) {
  const now = new Date();
  const [member, badges, trips, events] = await Promise.all([
    db.member.findUniqueOrThrow({ where: { id: memberId }, select: { id: true, firstName: true, lastName: true, photoUrl: true, points: true, group: { select: { name: true, color: true } } } }),
    kidBadges(memberId),
    db.tripRegistration.findMany({ where: { memberId, status: "CONFIRMED", trip: { departAt: { lt: now } } }, select: { id: true, trip: { select: { id: true, title: true, departAt: true } } }, orderBy: { trip: { departAt: "desc" } }, take: 6 }),
    db.eventRegistration.findMany({ where: { memberId, status: "CONFIRMED", event: { startAt: { lt: now } } }, select: { id: true, event: { select: { id: true, title: true, startAt: true } } }, orderBy: { event: { startAt: "desc" } }, take: 6 }),
  ]);
  const history: HistoryItem[] = [
    ...badges.earned.map((b) => ({ id: `b-${b.badge.id}`, kind: "badge" as const, title: b.badge.name, at: b.awardedAt, color: b.badge.color, icon: b.badge.icon, points: b.badge.points })),
    ...trips.map((r) => ({ id: `t-${r.id}`, kind: "trip" as const, title: r.trip.title, at: r.trip.departAt, color: "#1E9BD7", href: `/dashboard/trips/${r.trip.id}` })),
    ...events.map((r) => ({ id: `e-${r.id}`, kind: "event" as const, title: r.event.title, at: r.event.startAt, color: "#E8457C", href: `/dashboard/events/${r.event.id}` })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 12);
  return { member, badges, history };
}

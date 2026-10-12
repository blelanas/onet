import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { AuthError, can } from "@api/lib/auth/guards";

/**
 * Trip managers are the trip's TripMonitor members. They build the participant list, record payments
 * and finalize the list; admins (trips.manage) can do the same on every trip.
 */
export async function isTripManager(user: CurrentUser, tripId: string) {
  if (!user.memberId) return false;
  return (await db.tripMonitor.count({ where: { tripId, memberId: user.memberId } })) > 0;
}

/** Admins (trips.manage) or a manager of this trip. */
export async function canManageTrip(user: CurrentUser, tripId: string) {
  return can(user, "trips.manage") || (await isTripManager(user, tripId));
}

/** Throws FORBIDDEN unless the user manages the trip (NOT_FOUND when it doesn't exist). */
export async function requireTripManager(user: CurrentUser, tripId: string) {
  const trip = await db.trip.findUnique({ where: { id: tripId }, select: { id: true, title: true, listClosedAt: true, price: true } });
  if (!trip) throw new AuthError("NOT_FOUND");
  if (!(await canManageTrip(user, tripId))) throw new AuthError("FORBIDDEN");
  return trip;
}

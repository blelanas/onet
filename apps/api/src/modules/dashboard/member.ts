import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { addDays, startOfDay } from "@api/lib/dates";
import { activitySessions, announcementsFor, eventsAndTrips, latestNotifications, sortAgenda } from "./common";

export async function memberDashboard(user: CurrentUser) {
  const today = startOfDay();
  const now = new Date();
  const memberId = user.memberId ?? "__none__";
  const [upcoming, sessions, registrations, announcements, songs, notifications] = await Promise.all([
    eventsAndTrips(now, addDays(today, 60), { publicOnly: true, calendarAudiences: ["ALL"] }),
    activitySessions({ isPublic: true }, now, addDays(today, 7)),
    db.eventRegistration.findMany({ where: { memberId, status: { not: "CANCELLED" }, event: { startAt: { gte: now } } }, select: { eventId: true, status: true } }),
    announcementsFor(["ALL"], [], 4),
    db.song.findMany({ orderBy: [{ featured: "desc" }, { plays: "desc" }], take: 4, select: { id: true, title: true, category: true, coverUrl: true, durationSec: true, author: true } }),
    latestNotifications(user.id, 4),
  ]);
  const regs = new Map(registrations.map((r) => [r.eventId, r.status]));
  return {
    upcoming: sortAgenda(upcoming, 6).map((u) => ({ ...u, registration: u.kind === "event" ? (regs.get(u.id.slice(4)) ?? null) : null })),
    sessions: sortAgenda(sessions, 6),
    announcements,
    songs,
    notifications,
  };
}

import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { addDays } from "@api/lib/dates";
import { announcementsFor, startOfWeek } from "./common";
import { childSessions } from "./parent";

/** Deterministic "games of the week": rotates every ISO-ish week. */
function weekNumber(d = new Date()) {
  return Math.floor(startOfWeek(d).getTime() / (7 * 86400_000));
}

/** Badges earned + all badges (for locked ones). Never returns financial data. */
export async function kidBadges(memberId: string) {
  const [earned, all] = await Promise.all([
    db.memberBadge.findMany({ where: { memberId }, orderBy: { awardedAt: "desc" }, select: { awardedAt: true, badge: { select: { id: true, key: true, name: true, description: true, icon: true, color: true, points: true } } } }),
    db.badge.findMany({ orderBy: { points: "asc" }, select: { id: true, key: true, name: true, description: true, icon: true, color: true, points: true } }),
  ]);
  return { earned, all };
}

export async function kidDashboard(user: CurrentUser) {
  const memberId = user.memberId ?? "__none__";
  const me = await db.member.findUnique({ where: { id: memberId }, select: { id: true, firstName: true, lastName: true, photoUrl: true, points: true, groupId: true, group: { select: { name: true, color: true, schedule: true } } } });
  const weekStart = startOfWeek();
  const now = new Date();
  const gamesCount = await db.game.count();

  const [badges, sessions, events, trips, songs, games, announcements] = await Promise.all([
    kidBadges(memberId),
    me ? childSessions(me, weekStart, addDays(weekStart, 7)) : Promise.resolve([]),
    db.event.findMany({
      where: { startAt: { gte: now }, status: "PUBLISHED", isPublic: true, category: { not: "MEETING" } },
      orderBy: { startAt: "asc" },
      take: 4,
      select: { id: true, title: true, startAt: true, location: true, category: true, coverUrl: true, registrations: { where: { memberId }, select: { status: true } } },
    }),
    db.tripRegistration.findMany({
      where: { memberId, status: { in: ["CONFIRMED", "PENDING", "WAITLIST"] }, trip: { returnAt: { gte: now }, status: { not: "CANCELLED" } } },
      orderBy: { trip: { departAt: "asc" } },
      take: 4,
      select: { status: true, trip: { select: { id: true, title: true, destination: true, departAt: true, category: true, coverUrl: true } } },
    }),
    db.song.findMany({ where: { OR: [{ featured: true }, { category: "CHILDREN" }] }, orderBy: [{ featured: "desc" }, { plays: "desc" }], take: 4, select: { id: true, title: true, category: true, coverUrl: true, durationSec: true, author: true } }),
    gamesCount
      ? db.game.findMany({ orderBy: { createdAt: "asc" }, skip: (weekNumber() * 3) % Math.max(1, gamesCount - 2), take: 3, select: { id: true, name: true, description: true, category: true, durationMin: true, minPlayers: true, imageUrl: true } })
      : Promise.resolve([]),
    announcementsFor(["ALL", "KIDS"], me?.groupId ? [me.groupId] : [], 3),
  ]);

  return { me, badges, sessions, events, trips, songs, games, announcements };
}

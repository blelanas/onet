import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { can } from "@api/lib/auth/guards";
import { announcementWhere } from "@api/modules/communication/audience";
import { unreadMessagesCount } from "@api/modules/communication/messages";
import { getOrgProfile } from "@api/modules/public/queries";
import { getSetting } from "@api/modules/settings/store";
import { ANNOUNCEMENT_SELECT } from "./common";
import { canManageEditions, directedByWhere, onEditionWhere, onTeamWhere } from "@api/modules/events/access";
import { KIDS_OF_EDITION } from "@api/modules/events/series";

const NONE = "__none__";

/**
 * Member home (members = monitors / animators): the ONET Teboulba hero, then the editions running or
 * coming up, the member's edition teams, the events they direct, the trips they manage, the latest announcements they may see,
 * unread chat messages and the size of the "baggage" (songs, dances, games).
 */
export async function memberDashboard(user: CurrentUser) {
  const now = new Date();
  const memberId = user.memberId ?? NONE;
  const manage = canManageEditions(user);
  // Drafts only for those who manage them.
  const eventStatuses: Prisma.EventWhereInput["status"] = manage ? { not: "CANCELLED" } : { in: ["PUBLISHED", "COMPLETED"] };
  // Internal (non-public) editions: admins, and the members on one of their teams or directing them.
  const editionScope: Prisma.EventWhereInput = manage ? {} : { OR: [{ isPublic: true }, onEditionWhere(memberId)] };
  const tripStatuses: Prisma.TripWhereInput["status"] = { notIn: can(user, "trips.manage") ? ["CANCELLED"] : ["DRAFT", "CANCELLED"] };

  const [org, logoUrl, me, editions, teams, directed, trips, announcementScope, unreadMessages, songs, dances, games] = await Promise.all([
    getOrgProfile(),
    getSetting<string | null>("organization.logoUrl", null),
    user.memberId ? db.member.findUnique({ where: { id: user.memberId }, select: { firstName: true, firstNameAr: true } }) : Promise.resolve(null),
    // Editions (events of a series) still running or to come.
    db.event.findMany({
      where: { seriesId: { not: null }, endAt: { gte: now }, status: eventStatuses, ...editionScope },
      orderBy: { startAt: "asc" },
      take: 6,
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        location: true,
        coverUrl: true,
        editionNumber: true,
        seasonYear: true,
        series: { select: { id: true, name: true, nameAr: true, color: true, kind: true } },
      },
    }),
    // Teams of editions not over yet that the member leads or belongs to.
    db.eventTeam.findMany({
      where: { ...onTeamWhere(memberId), event: { endAt: { gte: now }, status: eventStatuses } },
      orderBy: [{ event: { startAt: "asc" } }, { name: "asc" }],
      take: 8,
      select: {
        id: true,
        name: true,
        color: true,
        leaderId: true,
        conversationId: true,
        event: { select: { id: true, title: true, startAt: true, endAt: true, series: { select: { name: true, nameAr: true, color: true } } } },
        members: { select: { memberId: true } },
        // Kids = active CHILD registrations (as in the edition's teams).
        _count: { select: { kids: { where: KIDS_OF_EDITION } } },
      },
    }),
    // Events (editions or one-off) not over yet that the member directs.
    db.event.findMany({
      where: { ...directedByWhere(memberId), endAt: { gte: now }, status: eventStatuses },
      orderBy: { startAt: "asc" },
      take: 6,
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        series: { select: { name: true, nameAr: true, color: true } },
        _count: { select: { teams: true, registrations: { where: KIDS_OF_EDITION } } },
      },
    }),
    // Trips the member manages (TripMonitor).
    db.trip.findMany({
      where: { monitors: { some: { memberId } }, returnAt: { gte: now }, status: tripStatuses },
      orderBy: { departAt: "asc" },
      take: 6,
      select: {
        id: true,
        title: true,
        destination: true,
        departAt: true,
        returnAt: true,
        coverUrl: true,
        category: true,
        status: true,
        capacity: true,
        _count: { select: { registrations: { where: { status: { in: ["CONFIRMED", "PENDING"] } } } } },
      },
    }),
    announcementWhere(user),
    unreadMessagesCount(user),
    db.song.count(),
    db.dance.count(),
    db.game.count(),
  ]);

  const announcements = await db.announcement.findMany({
    where: { AND: [announcementScope, { publishedAt: { lte: now } }] },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    take: 5,
    select: ANNOUNCEMENT_SELECT,
  });

  return {
    org: { name: org.name, fullName: org.fullName ?? null, fullNameAr: org.fullNameAr ?? null, logoUrl },
    firstName: me?.firstName ?? user.name.split(" ")[0] ?? user.name,
    firstNameAr: me?.firstNameAr ?? null,
    editions: editions.map((e) => ({ ...e, ongoing: e.startAt <= now })),
    teams: teams.map(({ leaderId, members, _count, ...t }) => ({
      ...t,
      isLeader: !!leaderId && leaderId === user.memberId,
      // Animators of the team: its members and its leader (counted once).
      animators: new Set([...members.map((m) => m.memberId), ...(leaderId ? [leaderId] : [])]).size,
      kids: _count.kids,
    })),
    directed: directed.map(({ _count, ...e }) => ({ ...e, teams: _count.teams, kids: _count.registrations })),
    trips,
    announcements,
    unreadMessages,
    counts: { songs, dances, games },
  };
}

import type { Request } from "express";
import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { requirePermission } from "@api/lib/auth/guards";
import { param } from "@api/lib/http";
import { startOfDay } from "@api/lib/dates";
import { ACTIVE_KID_REG, editionAccess, onTeamWhere } from "./access";
import { getEvent } from "./queries";

/** Member types that can lead or join a team (animators). */
export const TEAM_MEMBER_TYPES = ["MEMBER", "MONITOR", "STAFF"];

/**
 * People who may be put on a team: animators whose membership is ACTIVE (not pending approval, inactive or
 * suspended) and, when they have a login, whose account is active (the team chat adds that login).
 */
export const TEAM_ELIGIBLE: Prisma.MemberWhereInput = {
  type: { in: TEAM_MEMBER_TYPES },
  membershipStatus: "ACTIVE",
  OR: [{ userId: null }, { user: { status: "ACTIVE", isActive: true } }],
};

export const personSelect = { id: true, firstName: true, lastName: true, photoUrl: true, phone: true, type: true } satisfies Prisma.MemberSelect;

const teamInclude = {
  leader: { select: personSelect },
  members: { select: { member: { select: personSelect } } },
  _count: { select: { kids: { where: { ...ACTIVE_KID_REG, member: { type: "CHILD" } } } } },
} satisfies Prisma.EventTeamInclude;

type TeamRow = Prisma.EventTeamGetPayload<{ include: typeof teamInclude }>;

const person = (m: Prisma.MemberGetPayload<{ select: typeof personSelect }>) => ({ ...m, name: `${m.firstName} ${m.lastName}` });

function toTeam(t: TeamRow) {
  const members = t.members.map((x) => person(x.member)).sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
  return {
    id: t.id,
    eventId: t.eventId,
    name: t.name,
    color: t.color,
    leaderId: t.leaderId,
    leader: t.leader ? person(t.leader) : null,
    members,
    memberCount: members.length + (t.leader ? 1 : 0),
    kidsCount: t._count.kids,
    conversationId: t.conversationId,
  };
}

export async function editionTeams(eventId: string) {
  const rows = await db.eventTeam.findMany({ where: { eventId }, orderBy: [{ createdAt: "asc" }], include: teamInclude });
  return rows.map(toTeam);
}

/**
 * The animators' phone numbers are for the people working on the edition: admins (members.read_all /
 * events.manage) and the members on one of its teams (`access.seeKids`). Everyone else gets `phone: null`.
 */
export function withTeamPhones<T extends { leader: { phone: string | null } | null; members: { phone: string | null }[] }>(team: T, showPhones: boolean): T {
  if (showPhones) return team;
  return { ...team, leader: team.leader ? { ...team.leader, phone: null } : null, members: team.members.map((m) => ({ ...m, phone: null })) };
}

/** People who may lead / join a team. */
export async function teamCandidates() {
  return db.member.findMany({
    where: TEAM_ELIGIBLE,
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true, photoUrl: true, type: true },
  });
}

/** GET /events/:id/teams — the edition's teams; candidates for admins and the edition's leaders. */
export async function editionTeamsPage(req: Request) {
  const user = await requirePermission("events.read");
  const id = param(req, "id");
  const e = await getEvent(user, id);
  const access = await editionAccess(user, id);
  const [teams, candidates] = await Promise.all([editionTeams(id), access.manage || access.isLeader ? teamCandidates() : Promise.resolve([])]);
  return {
    edition: { id: e.id, title: e.title },
    teams: teams.map((t) => withTeamPhones(t, access.seeKids)),
    candidates,
    canManage: access.manage,
    isLeader: access.isLeader,
    ledTeamIds: access.ledTeamIds,
    myTeamIds: access.myTeamIds,
  };
}

const listInclude = {
  ...teamInclude,
  event: {
    select: {
      id: true,
      title: true,
      editionNumber: true,
      seasonYear: true,
      startAt: true,
      endAt: true,
      coverUrl: true,
      status: true,
      series: { select: { id: true, name: true, nameAr: true, color: true, kind: true } },
    },
  },
} satisfies Prisma.EventTeamInclude;

function toListTeam(user: CurrentUser, t: Prisma.EventTeamGetPayload<{ include: typeof listInclude }>) {
  const role = !user.memberId ? null : t.leaderId === user.memberId ? "LEADER" : t.members.some((m) => m.member.id === user.memberId) ? "MEMBER" : null;
  return { ...toTeam(t), edition: t.event, role: role as "LEADER" | "MEMBER" | null };
}

/** GET /teams/mine — teams where the user's member record is the leader or a member. */
export async function myTeamsPage() {
  const user = await requirePermission("events.read");
  const rows = user.memberId
    ? await db.eventTeam.findMany({ where: onTeamWhere(user.memberId), include: listInclude, orderBy: [{ event: { startAt: "desc" } }, { name: "asc" }] })
    : [];
  const now = new Date();
  const teams = rows.map((t) => toListTeam(user, t));
  return {
    current: teams.filter((t) => t.edition.endAt >= startOfDay(now)),
    past: teams.filter((t) => t.edition.endAt < startOfDay(now)),
    canSeeAll: user.permissions.has("events.manage"),
  };
}

/** GET /teams — admins: every team of the current and upcoming editions. */
export async function allTeamsPage() {
  const user = await requirePermission("events.manage");
  const rows = await db.eventTeam.findMany({
    where: { event: { endAt: { gte: startOfDay(new Date()) } } },
    include: listInclude,
    orderBy: [{ event: { startAt: "asc" } }, { name: "asc" }],
  });
  return { teams: rows.map((t) => toListTeam(user, t)) };
}

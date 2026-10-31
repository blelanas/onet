import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import { requestCache } from "@api/lib/context";
import type { CurrentUser } from "@api/lib/auth/session";
import { AuthError, can } from "@api/lib/auth/guards";
import { visibleMemberIds } from "@api/lib/auth/scope";

/**
 * Access rules for series editions, their teams and their kids (one place, used by the events and
 * kids modules and by the member profile scope):
 *  - events.manage (admins) may do everything;
 *  - a team leader (Member = EventTeam.leaderId) manages only the kids of the teams they lead: adds kids
 *    (existing or new) into one of those teams, moves a kid between those teams, takes an unassigned kid into
 *    one of them, edits the cards of those kids and removes them from the edition; changes the members of their
 *    own team and takes its attendance. Kids of other teams stay read-only for them;
 *  - the director of an event (Event.directorId), like an admin inside the event, manages all its teams
 *    (create, rename, delete, choose leaders and members), all its kids and all the attendance. Editing the
 *    event itself (dates, publication, deletion) stays with events.manage;
 *  - the other team members are read-only (kids list, attendance of their team);
 *  - anyone with events.read may read series, editions and teams (the animators' phone numbers only for
 *    the admins and the edition's teams and director);
 *  - kids and their parents' phone numbers: members.read_all / events.manage see every kid, other users
 *    only the kids of editions where they are on a team (leader or member) or that they direct, and through
 *    a team only the kid's card and those editions (see memberViewScope);
 *  - being "on a team" or director needs an ACTIVE membership: suspended, inactive or pending members get
 *    none of this.
 */

/**
 * Teams a member belongs to: as leader or as a team member. Only while the membership is ACTIVE: a
 * suspended (or inactive / pending) member keeps no access to the edition's kids and parents' phones.
 */
export function onTeamWhere(memberId: string): Prisma.EventTeamWhereInput {
  return {
    OR: [
      { leaderId: memberId, leader: { membershipStatus: "ACTIVE" } },
      { members: { some: { memberId, member: { membershipStatus: "ACTIVE" } } } },
    ],
  };
}

/** Events directed by a member, only while the membership is ACTIVE (same rule as the team leaders). */
export function directedByWhere(memberId: string): Prisma.EventWhereInput {
  return { directorId: memberId, director: { membershipStatus: "ACTIVE" } };
}

/** Events a member works on: on one of their teams (leader or member), or as their director. */
export function onEditionWhere(memberId: string): Prisma.EventWhereInput {
  return { OR: [{ teams: { some: onTeamWhere(memberId) } }, directedByWhere(memberId)] };
}

/** Registrations that count as "the kid takes part" (cancelled ones don't). */
export const ACTIVE_KID_REG: Prisma.EventRegistrationWhereInput = { status: { not: "CANCELLED" } };

export function canManageEditions(user: CurrentUser) {
  return can(user, "events.manage");
}

/** Users who see every kid (and every parent phone number). */
export function seesAllKids(user: CurrentUser) {
  return can(user, "members.read_all") || can(user, "events.manage");
}

/** The current user's teams (as leader or member), resolved once per request. */
export const myTeams = requestCache("myTeams", async (user: CurrentUser) => {
  if (!user.memberId) return [] as { id: string; eventId: string; isLeader: boolean }[];
  const teams = await db.eventTeam.findMany({ where: onTeamWhere(user.memberId), select: { id: true, eventId: true, leaderId: true } });
  return teams.map((t) => ({ id: t.id, eventId: t.eventId, isLeader: t.leaderId === user.memberId }));
});

/** Ids of the events the current user directs (while their membership is ACTIVE), resolved once per request. */
export const myDirectedEditions = requestCache("myDirectedEditions", async (user: CurrentUser) => {
  if (!user.memberId) return [] as string[];
  return (await db.event.findMany({ where: directedByWhere(user.memberId), select: { id: true } })).map((e) => e.id);
});

export type EditionAccess = {
  /** events.manage: everything on every edition. */
  manage: boolean;
  /** Leads at least one team of this edition. */
  isLeader: boolean;
  /** Leader or member of at least one team of this edition. */
  isOnTeam: boolean;
  /** Director of this edition. */
  isDirector: boolean;
  /** On one of its teams or its director: works on this edition (sees it even when internal). */
  onEdition: boolean;
  /** Teams of this edition led by the user. */
  ledTeamIds: string[];
  /** Ids of the user's teams in this edition. */
  myTeamIds: string[];
  /** May list the kids (and their parents' phones), and see the animators' phones. */
  seeKids: boolean;
  /** Has kid controls: may add kids (a leader: only into the teams they lead, see ledTeamIds). */
  manageKids: boolean;
  /** May add / edit / remove / move every kid of the edition, whatever their team: admins and the director. */
  manageAllKids: boolean;
  /** May create, edit (leader included) and delete every team of this edition: admins and the director. */
  manageTeams: boolean;
};

export async function editionAccess(user: CurrentUser, eventId: string): Promise<EditionAccess> {
  const manage = canManageEditions(user);
  const [teams, directed] = await Promise.all([myTeams(user), myDirectedEditions(user)]);
  const mine = teams.filter((t) => t.eventId === eventId);
  const ledTeamIds = mine.filter((t) => t.isLeader).map((t) => t.id);
  const isLeader = ledTeamIds.length > 0;
  const isOnTeam = mine.length > 0;
  const isDirector = directed.includes(eventId);
  return {
    manage,
    isLeader,
    isOnTeam,
    isDirector,
    onEdition: isOnTeam || isDirector,
    ledTeamIds,
    myTeamIds: mine.map((t) => t.id),
    seeKids: seesAllKids(user) || isOnTeam || isDirector,
    manageKids: manage || isLeader || isDirector,
    manageAllKids: manage || isDirector,
    manageTeams: manage || isDirector,
  };
}

export async function assertCanSeeKids(user: CurrentUser, eventId: string) {
  const a = await editionAccess(user, eventId);
  if (!a.seeKids) throw new AuthError("FORBIDDEN");
  return a;
}

export async function assertCanManageKids(user: CurrentUser, eventId: string) {
  const a = await editionAccess(user, eventId);
  if (!a.manageKids) throw new AuthError("FORBIDDEN");
  return a;
}

export async function assertCanManageTeams(user: CurrentUser, eventId: string) {
  const a = await editionAccess(user, eventId);
  if (!a.manageTeams) throw new AuthError("FORBIDDEN");
  return a;
}

/**
 * Prisma filter restricting CHILD members to the kids this user may see through teams:
 * {} for users who see every kid, otherwise kids registered in an edition where the user is on a team or
 * that the user directs.
 */
export function kidScopeWhere(user: CurrentUser): Prisma.MemberWhereInput {
  if (seesAllKids(user)) return {};
  if (!user.memberId) return { id: { in: [] } };
  return { eventRegistrations: { some: { ...ACTIVE_KID_REG, ...kidRegScopeWhere(user) } } };
}

/**
 * Prisma filter restricting a kid's registrations (editions shown, counts, filters) to the ones this user may
 * see: every one for users who see every kid, otherwise only those of the editions where the user is on a team
 * or that the user directs (a kid seen through one edition doesn't reveal its other editions).
 */
export function kidRegScopeWhere(user: CurrentUser): Prisma.EventRegistrationWhereInput {
  if (seesAllKids(user)) return {};
  if (!user.memberId) return { id: { in: [] } };
  return { event: onEditionWhere(user.memberId) };
}

/** True when the user sees this kid because they are on a team (or the director) of one of its editions. */
export async function kidVisibleViaTeams(user: CurrentUser, kidId: string) {
  if (!user.memberId && !seesAllKids(user)) return false;
  return (await db.member.count({ where: { id: kidId, type: "CHILD", ...kidScopeWhere(user) } })) > 0;
}

/**
 * How the user may see a member's profile / a kid's history:
 *  - "full": the regular member scope (members.read_all, parents, group monitors, trip managers…) or the
 *    admins who see every kid;
 *  - "team": a kid seen only because the user is on a team (or the director) of one of its editions → its
 *    identity, guardian contact and the history of those editions, nothing from other groups, events or trips;
 *  - null: not at all.
 */
export async function memberViewScope(user: CurrentUser, memberId: string): Promise<"full" | "team" | null> {
  const ids = await visibleMemberIds(user);
  if (ids === "all" || ids.includes(memberId)) return "full";
  if (!(await kidVisibleViaTeams(user, memberId))) return null;
  return seesAllKids(user) ? "full" : "team";
}

/** Ids of the editions where the user is on a team (leader or member) or that the user directs. */
export async function myEditionIds(user: CurrentUser) {
  const [teams, directed] = await Promise.all([myTeams(user), myDirectedEditions(user)]);
  return new Set([...teams.map((t) => t.eventId), ...directed]);
}

/**
 * May the user manage a kid of the edition that is in `teamId` (null: no team)? Admins and the director: every
 * kid; a leader: only the kids of the teams they lead.
 */
export function canManageKidOfTeam(access: Pick<EditionAccess, "manageAllKids" | "ledTeamIds">, teamId: string | null) {
  return access.manageAllKids || (!!teamId && access.ledTeamIds.includes(teamId));
}

/**
 * Kid card data (photo, names, birth date, parent contact): member managers, admins, the director of one of the
 * kid's editions, or the leader of the kid's team in one of its editions (while ACTIVE).
 */
export async function canEditKid(user: CurrentUser, kidId: string) {
  if (can(user, "members.manage") || canManageEditions(user)) return true;
  if (!user.memberId) return false;
  const n = await db.eventRegistration.count({
    where: {
      memberId: kidId,
      ...ACTIVE_KID_REG,
      OR: [{ team: { leaderId: user.memberId, leader: { membershipStatus: "ACTIVE" } } }, { event: directedByWhere(user.memberId) }],
    },
  });
  return n > 0;
}

/**
 * What the user may change on a team: "full" (admins and the edition's director, i.e. `access.manageTeams`:
 * everything, incl. the leader), "members" (the team's own leader, while their membership is ACTIVE: name,
 * colour and members) or null.
 */
export function teamEditRights(
  user: CurrentUser,
  access: Pick<EditionAccess, "manageTeams">,
  team: { leaderId: string | null; leader: { membershipStatus: string } | null },
): "full" | "members" | null {
  if (access.manageTeams) return "full";
  if (user.memberId && team.leaderId === user.memberId && team.leader?.membershipStatus === "ACTIVE") return "members";
  return null;
}

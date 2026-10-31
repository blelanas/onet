import { z } from "zod";
import { db } from "@api/lib/db";
import { AuthError, requirePermission } from "@api/lib/auth/guards";
import { ActionError, formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { assertCanManageTeams, editionAccess, teamEditRights } from "./access";
import { hexColor } from "./series-actions";
import { TEAM_ELIGIBLE, TEAM_MEMBER_TYPES } from "./teams";
import { deleteTeamChat, syncTeamChat } from "./team-chat";

const idList = z.preprocess((v) => (v == null || v === "" ? [] : Array.isArray(v) ? v : [v]), z.array(z.string().min(1)).max(200));

const teamSchema = z.object({
  eventId: zs.id,
  id: zs.optId,
  name: zs.reqStr(80),
  color: hexColor,
  leaderId: zs.optId,
  memberIds: idList,
});

/**
 * POST /events/:id/teams — create (admins, the edition's director) or update a team. Admins and the
 * director change everything; the team's own leader may rename it, recolour it and add / remove its members (not change the leader). The group chat
 * is created / synced in the same transaction.
 */
export async function saveTeam(fd: FormData | Record<string, unknown>) {
  return runAction(teamSchema, formToObject(fd), async (d) => {
    const user = await requirePermission("events.read");
    const event = await db.event.findUnique({ where: { id: d.eventId }, select: { id: true, title: true } });
    if (!event) throw new ActionError("errors.notFound");
    const existing = d.id
      ? await db.eventTeam.findUnique({ where: { id: d.id }, select: { id: true, eventId: true, leaderId: true, leader: { select: { membershipStatus: true } }, members: { select: { memberId: true } } } })
      : null;
    if (d.id && (!existing || existing.eventId !== event.id)) throw new ActionError("errors.notFound");
    // Admins and the edition's director: everything; a team's own leader: its name, colour and members.
    const access = await editionAccess(user, event.id);
    const rights = existing ? teamEditRights(user, access, existing) : access.manageTeams ? "full" : null;
    if (!rights) throw new AuthError("FORBIDDEN");

    const leaderId = rights === "full" ? (d.leaderId ?? null) : (existing?.leaderId ?? null);
    const memberIds = [...new Set(d.memberIds)].filter((id) => id !== leaderId);
    const people = [...memberIds, ...(leaderId && rights === "full" ? [leaderId] : [])];
    // Newcomers must be eligible (ACTIVE animators with an active login, if any). People already on the team
    // are kept as they are, so saving the team never fails because one of them was suspended since.
    const current = new Set([...(existing?.members.map((m) => m.memberId) ?? []), ...(existing?.leaderId ? [existing.leaderId] : [])]);
    const added = people.filter((id) => !current.has(id));
    const kept = people.filter((id) => current.has(id));
    if (added.length && (await db.member.count({ where: { id: { in: added }, ...TEAM_ELIGIBLE } })) !== added.length) throw new ActionError("errors.validation");
    if (kept.length && (await db.member.count({ where: { id: { in: kept }, type: { in: TEAM_MEMBER_TYPES } } })) !== kept.length) throw new ActionError("errors.validation");

    const result = await db.$transaction(async (tx) => {
      const team = existing
        ? await tx.eventTeam.update({ where: { id: existing.id }, data: { name: d.name, color: d.color, leaderId } })
        : await tx.eventTeam.create({ data: { eventId: event.id, name: d.name, color: d.color, leaderId } });
      await tx.eventTeamMember.deleteMany({ where: { teamId: team.id, memberId: { notIn: memberIds } } });
      const have = new Set((await tx.eventTeamMember.findMany({ where: { teamId: team.id }, select: { memberId: true } })).map((m) => m.memberId));
      for (const memberId of memberIds) if (!have.has(memberId)) await tx.eventTeamMember.create({ data: { teamId: team.id, memberId } });
      const conversationId = await syncTeamChat(tx, team.id, user.id);
      return { id: team.id, conversationId };
    });
    await audit(user.id, existing ? "update" : "create", "EventTeam", result.id, { eventId: event.id, name: d.name, leaderId, members: memberIds.length });
    return result;
  });
}

/**
 * DELETE /events/teams/:teamId — admins and the edition's director; the kids stay in the edition (unassigned)
 * and the group chat is deleted.
 */
export async function deleteTeam(teamId: string) {
  return runAction(zs.id, teamId, async (id) => {
    const user = await requirePermission("events.read");
    const team = await db.eventTeam.findUnique({ where: { id }, select: { id: true, name: true, eventId: true, conversationId: true } });
    if (!team) throw new ActionError("errors.notFound");
    await assertCanManageTeams(user, team.eventId);
    await db.$transaction(async (tx) => {
      await tx.eventRegistration.updateMany({ where: { teamId: team.id }, data: { teamId: null } });
      await tx.eventTeam.delete({ where: { id: team.id } });
      await deleteTeamChat(tx, team.conversationId);
    });
    await audit(user.id, "delete", "EventTeam", team.id, { eventId: team.eventId, name: team.name });
  });
}

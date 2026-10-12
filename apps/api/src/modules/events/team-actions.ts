import { z } from "zod";
import { db } from "@api/lib/db";
import { AuthError, requirePermission } from "@api/lib/auth/guards";
import { ActionError, formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { teamEditRights } from "./access";
import { hexColor } from "./series-actions";
import { TEAM_MEMBER_TYPES } from "./teams";
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
 * POST /events/:id/teams — create (admins) or update a team. Admins change everything; the team's own
 * leader may rename it, recolour it and add / remove its members (not change the leader). The group chat
 * is created / synced in the same transaction.
 */
export async function saveTeam(fd: FormData | Record<string, unknown>) {
  return runAction(teamSchema, formToObject(fd), async (d) => {
    const user = await requirePermission("events.read");
    const event = await db.event.findUnique({ where: { id: d.eventId }, select: { id: true, title: true } });
    if (!event) throw new ActionError("errors.notFound");
    const existing = d.id ? await db.eventTeam.findUnique({ where: { id: d.id }, select: { id: true, eventId: true, leaderId: true } }) : null;
    if (d.id && (!existing || existing.eventId !== event.id)) throw new ActionError("errors.notFound");
    const rights = existing ? teamEditRights(user, existing) : user.permissions.has("events.manage") ? "full" : null;
    if (!rights) throw new AuthError("FORBIDDEN");

    const leaderId = rights === "full" ? (d.leaderId ?? null) : (existing?.leaderId ?? null);
    const memberIds = [...new Set(d.memberIds)].filter((id) => id !== leaderId);
    const people = [...memberIds, ...(leaderId && rights === "full" ? [leaderId] : [])];
    if (people.length) {
      const ok = await db.member.count({ where: { id: { in: people }, type: { in: TEAM_MEMBER_TYPES } } });
      if (ok !== people.length) throw new ActionError("errors.validation");
    }

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

/** DELETE /events/teams/:teamId — admins; the kids stay in the edition (unassigned) and the group chat is deleted. */
export async function deleteTeam(teamId: string) {
  return runAction(zs.id, teamId, async (id) => {
    const user = await requirePermission("events.manage");
    const team = await db.eventTeam.findUnique({ where: { id }, select: { id: true, name: true, eventId: true, conversationId: true } });
    if (!team) throw new ActionError("errors.notFound");
    await db.$transaction(async (tx) => {
      await tx.eventRegistration.updateMany({ where: { teamId: team.id }, data: { teamId: null } });
      await tx.eventTeam.delete({ where: { id: team.id } });
      await deleteTeamChat(tx, team.conversationId);
    });
    await audit(user.id, "delete", "EventTeam", team.id, { eventId: team.eventId, name: team.name });
  });
}

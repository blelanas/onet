import type { Prisma, PrismaClient } from "@prisma/client";
import { conversationLink } from "../communication/links";

/**
 * Every edition team has a GROUP conversation: subject "<edition title> · <team name>", participants =
 * the logins (Member.userId) of the leader (group admin) and of the team members. Members without a
 * login are skipped, and so are members whose membership isn't ACTIVE or whose account isn't active
 * (suspended people leave the chat). Takes the Prisma client / transaction explicitly so the seed can
 * use it too.
 */
type Client = PrismaClient | Prisma.TransactionClient;

export function teamChatSubject(editionTitle: string, teamName: string) {
  return `${editionTitle} · ${teamName}`;
}

const chatMemberSelect = { userId: true, membershipStatus: true, user: { select: { status: true, isActive: true } } } satisfies Prisma.MemberSelect;

/** A team member takes part in the chat through an active login, while their membership is ACTIVE. */
function inChat(m: Prisma.MemberGetPayload<{ select: typeof chatMemberSelect }>) {
  return !!m.userId && m.membershipStatus === "ACTIVE" && m.user?.status === "ACTIVE" && m.user.isActive;
}

/** Creates the team's group conversation if needed and makes its participants match the team. Returns its id. */
export async function syncTeamChat(tx: Client, teamId: string, createdById?: string | null): Promise<string | null> {
  const team = await tx.eventTeam.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      conversationId: true,
      event: { select: { title: true } },
      leader: { select: chatMemberSelect },
      members: { select: { member: { select: chatMemberSelect } } },
    },
  });
  if (!team) return null;
  const subject = teamChatSubject(team.event.title, team.name);

  // userId → isAdmin (the leader wins when also listed as a member).
  const wanted = new Map<string, boolean>();
  for (const m of team.members) if (inChat(m.member)) wanted.set(m.member.userId!, false);
  if (team.leader && inChat(team.leader)) wanted.set(team.leader.userId!, true);

  let conversationId = team.conversationId;
  const existingConv = conversationId ? await tx.conversation.findUnique({ where: { id: conversationId }, select: { subject: true, kind: true } }) : null;
  if (!existingConv) {
    const conv = await tx.conversation.create({ data: { kind: "GROUP", subject, createdById: createdById ?? null } });
    conversationId = conv.id;
    await tx.eventTeam.update({ where: { id: team.id }, data: { conversationId } });
  } else if (existingConv.subject !== subject || existingConv.kind !== "GROUP") {
    await tx.conversation.update({ where: { id: conversationId! }, data: { subject, kind: "GROUP" } });
  }

  const current = await tx.conversationParticipant.findMany({ where: { conversationId: conversationId! }, select: { userId: true, isAdmin: true } });
  const gone = current.filter((p) => !wanted.has(p.userId)).map((p) => p.userId);
  if (gone.length) {
    await tx.conversationParticipant.deleteMany({ where: { conversationId: conversationId!, userId: { in: gone } } });
    // They can't open it any more: their unread notifications about it are done.
    await tx.notification.updateMany({ where: { userId: { in: gone }, type: "MESSAGE", readAt: null, link: conversationLink(conversationId!) }, data: { readAt: new Date() } });
  }
  for (const [userId, isAdmin] of wanted) {
    const p = current.find((x) => x.userId === userId);
    if (!p) await tx.conversationParticipant.create({ data: { conversationId: conversationId!, userId, isAdmin } });
    else if (p.isAdmin !== isAdmin) await tx.conversationParticipant.update({ where: { conversationId_userId: { conversationId: conversationId!, userId } }, data: { isAdmin } });
  }
  return conversationId;
}

/** Keeps the chat subjects in line after an edition is renamed. */
export async function syncEditionChats(tx: Client, eventId: string) {
  const teams = await tx.eventTeam.findMany({ where: { eventId }, select: { id: true } });
  for (const t of teams) await syncTeamChat(tx, t.id);
}

/** Deletes a team's group conversation (messages and participants cascade). */
export async function deleteTeamChat(tx: Client, conversationId: string | null | undefined) {
  if (!conversationId) return;
  await tx.conversation.deleteMany({ where: { id: conversationId, kind: "GROUP" } });
}

import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { AuthError, hasRole } from "@api/lib/auth/guards";
import { conversationLink } from "./links";

// The link of a conversation (also the key of its MESSAGE notifications) lives in ./links (no dependencies).
export { conversationLink };

/** Platform administrators may list, open and manage every group (not only the ones they belong to). */
export function isPlatformAdmin(user: CurrentUser) {
  return hasRole(user, "super_admin", "admin");
}

const userSelect = { id: true, name: true, avatarUrl: true, roles: { select: { role: { select: { key: true } } } } } satisfies Prisma.UserSelect;
const teamSelect = { id: true, name: true, eventId: true, event: { select: { title: true } } } satisfies Prisma.EventTeamSelect;

type TeamRow = Prisma.EventTeamGetPayload<{ select: typeof teamSelect }>;
/** Event-team chat: its membership and name are managed by the team, not from the messaging page. */
function teamInfo(team: TeamRow | null) {
  return team ? { id: team.id, eventId: team.eventId, teamName: team.name, editionTitle: team.event.title } : null;
}

const roleKeys = (u: { roles: { role: { key: string } }[] }) => u.roles.map((r) => r.role.key);

/** Messages of a conversation not read yet by `userId` (others' messages after lastReadAt). */
function unreadWhere(conversationId: string, userId: string, lastReadAt: Date | null): Prisma.MessageWhereInput {
  return { conversationId, senderId: { not: userId }, ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}) };
}

/** Conversations of the user, most recent first, with unread counts. Groups carry their name, size and team. */
export async function listConversations(user: CurrentUser, q?: string) {
  const convs = await db.conversation.findMany({
    where: {
      participants: { some: { userId: user.id } },
      ...(q
        ? {
            OR: [
              { subject: { contains: q } },
              { team: { is: { name: { contains: q } } } },
              { participants: { some: { userId: { not: user.id }, user: { name: { contains: q } } } } },
              { messages: { some: { body: { contains: q } } } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      // A direct thread needs the other person; a group only shows a few faces.
      participants: { where: { userId: { not: user.id } }, take: 4, include: { user: { select: userSelect } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, createdAt: true, senderId: true, sender: { select: { name: true } } } },
      team: { select: teamSelect },
      _count: { select: { participants: true } },
    },
  });
  const mine = await db.conversationParticipant.findMany({ where: { userId: user.id, conversationId: { in: convs.map((c) => c.id) } }, select: { conversationId: true, lastReadAt: true, isAdmin: true } });
  const me = new Map(mine.map((p) => [p.conversationId, p]));
  const unread = await Promise.all(convs.map((c) => db.message.count({ where: unreadWhere(c.id, user.id, me.get(c.id)?.lastReadAt ?? null) })));
  return convs
    .map((c, i) => {
      const others = c.participants.map((p) => ({ id: p.user.id, name: p.user.name, avatarUrl: p.user.avatarUrl, roles: roleKeys(p.user) }));
      const team = teamInfo(c.team);
      const group = c.kind === "GROUP" || !!team;
      const last = c.messages[0];
      return {
        id: c.id,
        kind: group ? ("GROUP" as const) : ("DIRECT" as const),
        /** Group name, or the other person(s) for a direct thread. */
        title: group ? (c.subject ?? team?.teamName ?? "") : others.map((o) => o.name).join(", "),
        subject: c.subject,
        others,
        participantsCount: c._count.participants,
        isAdmin: me.get(c.id)?.isAdmin ?? false,
        team,
        last: last ? { body: last.body, createdAt: last.createdAt, senderId: last.senderId, senderName: last.sender.name } : null,
        lastAt: last?.createdAt ?? c.createdAt,
        unread: unread[i],
      };
    })
    .sort((a, b) => +b.lastAt - +a.lastAt);
}

export type ConversationSummary = Awaited<ReturnType<typeof listConversations>>[number];

/**
 * Opens a conversation and marks it as read. Participants only — except platform admins, who may
 * open any group (read-only unless they are a participant; it is not marked read for them).
 */
export async function openConversation(user: CurrentUser, id: string) {
  const conv = await db.conversation.findUnique({
    where: { id },
    include: {
      participants: { include: { user: { select: userSelect } } },
      // Newest page of the thread (reversed below to chronological order).
      messages: { orderBy: { createdAt: "desc" }, take: 300, include: { sender: { select: { id: true, name: true, avatarUrl: true } } } },
      team: { select: teamSelect },
    },
  });
  if (!conv) throw new AuthError("NOT_FOUND");
  const group = conv.kind === "GROUP" || !!conv.team;
  const meP = conv.participants.find((p) => p.userId === user.id);
  const adminView = !meP && group && isPlatformAdmin(user);
  if (!meP && !adminView) throw new AuthError("NOT_FOUND");
  const messages = conv.messages.reverse();
  if (meP) {
    const now = new Date();
    // Read up to the newest message actually returned, so one arriving meanwhile stays unread.
    let readUpTo = messages.at(-1)?.createdAt ?? now;
    if (messages.length) {
      // Timestamps are stored with millisecond precision: if a message we didn't return shares the
      // newest timestamp, stop 1 ms short so the strict `createdAt > lastReadAt` checks keep it unread.
      const tie = await db.message.count({ where: { conversationId: id, createdAt: readUpTo, id: { notIn: messages.map((m) => m.id) } } });
      if (tie > 0) readUpTo = new Date(readUpTo.getTime() - 1);
    }
    await Promise.all([
      db.conversationParticipant.update({ where: { conversationId_userId: { conversationId: id, userId: user.id } }, data: { lastReadAt: readUpTo } }),
      db.notification.updateMany({ where: { userId: user.id, type: "MESSAGE", readAt: null, link: conversationLink(id) }, data: { readAt: now } }),
    ]);
  }
  const team = teamInfo(conv.team);
  const others = conv.participants.filter((p) => p.userId !== user.id);
  const participants = conv.participants
    .map((p) => ({ userId: p.userId, name: p.user.name, avatarUrl: p.user.avatarUrl, isAdmin: p.isAdmin, roles: roleKeys(p.user) }))
    // Admins first, then alphabetical.
    .sort((a, b) => Number(b.isAdmin) - Number(a.isAdmin) || a.name.localeCompare(b.name));
  const isAdmin = !!meP?.isAdmin;
  return {
    id: conv.id,
    kind: group ? ("GROUP" as const) : ("DIRECT" as const),
    title: group ? (conv.subject ?? team?.teamName ?? "") : others.map((p) => p.user.name).join(", "),
    subject: conv.subject,
    others: others.map((p) => ({ id: p.user.id, name: p.user.name, avatarUrl: p.user.avatarUrl, roles: roleKeys(p.user), lastReadAt: p.lastReadAt })),
    participants: group ? participants : [],
    participantsCount: conv.participants.length,
    isParticipant: !!meP,
    isAdmin,
    /** Rename / add / remove / promote: group admins and platform admins, never for team chats. */
    canManage: group && !team && (isAdmin || isPlatformAdmin(user)),
    /** Leave: any participant of a group that isn't a team chat. */
    canLeave: group && !team && !!meP,
    team,
    messages,
  };
}

/** Existing one-to-one conversation between two users, if any (groups of two are not direct threads). */
export async function findDirectConversation(userId: string, otherId: string, tx: Prisma.TransactionClient = db) {
  const candidates = await tx.conversation.findMany({
    where: { kind: "DIRECT", AND: [{ participants: { some: { userId } } }, { participants: { some: { userId: otherId } } }] },
    select: { id: true, _count: { select: { participants: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return candidates.find((c) => c._count.participants === 2)?.id ?? null;
}

export async function unreadMessagesCount(user: CurrentUser) {
  const parts = await db.conversationParticipant.findMany({ where: { userId: user.id }, select: { conversationId: true, lastReadAt: true } });
  const counts = await Promise.all(parts.map((p) => db.message.count({ where: unreadWhere(p.conversationId, user.id, p.lastReadAt) })));
  return counts.reduce((s, n) => s + n, 0);
}

/** Every group (platform admins): name, size, team and last activity. */
export async function listAllGroups(q?: string) {
  const rows = await db.conversation.findMany({
    where: { kind: "GROUP", ...(q ? { OR: [{ subject: { contains: q } }, { team: { is: { name: { contains: q } } } }] } : {}) },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      team: { select: teamSelect },
      _count: { select: { participants: true, messages: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  });
  const creatorIds = [...new Set(rows.map((r) => r.createdById).filter((x): x is string => !!x))];
  const creators = new Map((await db.user.findMany({ where: { id: { in: creatorIds } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));
  return rows.map((r) => {
    const team = teamInfo(r.team);
    return {
      id: r.id,
      title: r.subject ?? team?.teamName ?? "",
      participantsCount: r._count.participants,
      messagesCount: r._count.messages,
      createdBy: r.createdById ? (creators.get(r.createdById) ?? null) : null,
      createdAt: r.createdAt,
      lastAt: r.messages[0]?.createdAt ?? r.createdAt,
      team,
    };
  });
}

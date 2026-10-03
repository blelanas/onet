import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { AuthError } from "@api/lib/auth/guards";

/** Conversations of the user, most recent first, with unread counts. */
export async function listConversations(user: CurrentUser, q?: string) {
  const convs = await db.conversation.findMany({
    where: {
      participants: { some: { userId: user.id } },
      ...(q
        ? {
            OR: [
              { subject: { contains: q } },
              { participants: { some: { userId: { not: user.id }, user: { name: { contains: q } } } } },
              { messages: { some: { body: { contains: q } } } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      participants: { include: { user: { select: { id: true, name: true, avatarUrl: true, roles: { select: { role: { select: { key: true } } } } } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, createdAt: true, senderId: true } },
    },
  });
  const unread = await Promise.all(
    convs.map((c) => {
      const me = c.participants.find((p) => p.userId === user.id);
      return db.message.count({ where: { conversationId: c.id, senderId: { not: user.id }, ...(me?.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {}) } });
    }),
  );
  return convs
    .map((c, i) => ({
      id: c.id,
      subject: c.subject,
      others: c.participants.filter((p) => p.userId !== user.id).map((p) => ({ id: p.user.id, name: p.user.name, avatarUrl: p.user.avatarUrl, roles: p.user.roles.map((r) => r.role.key) })),
      last: c.messages[0] ?? null,
      lastAt: c.messages[0]?.createdAt ?? c.createdAt,
      unread: unread[i],
    }))
    .sort((a, b) => +b.lastAt - +a.lastAt);
}

export type ConversationSummary = Awaited<ReturnType<typeof listConversations>>[number];

/** Opens a conversation (participants only) and marks it as read. */
export async function openConversation(user: CurrentUser, id: string) {
  const conv = await db.conversation.findUnique({
    where: { id },
    include: {
      participants: { include: { user: { select: { id: true, name: true, avatarUrl: true, roles: { select: { role: { select: { key: true } } } } } } } },
      messages: { orderBy: { createdAt: "asc" }, take: 300, include: { sender: { select: { id: true, name: true, avatarUrl: true } } } },
    },
  });
  if (!conv) throw new AuthError("NOT_FOUND");
  if (!conv.participants.some((p) => p.userId === user.id)) throw new AuthError("NOT_FOUND");
  const now = new Date();
  await Promise.all([
    db.conversationParticipant.update({ where: { conversationId_userId: { conversationId: id, userId: user.id } }, data: { lastReadAt: now } }),
    db.notification.updateMany({ where: { userId: user.id, type: "MESSAGE", readAt: null, link: `/dashboard/messages?c=${id}` }, data: { readAt: now } }),
  ]);
  return {
    id: conv.id,
    subject: conv.subject,
    others: conv.participants.filter((p) => p.userId !== user.id).map((p) => ({ id: p.user.id, name: p.user.name, avatarUrl: p.user.avatarUrl, roles: p.user.roles.map((r) => r.role.key), lastReadAt: p.lastReadAt })),
    messages: conv.messages,
  };
}

/** Existing one-to-one conversation between two users, if any. */
export async function findDirectConversation(userId: string, otherId: string) {
  const candidates = await db.conversation.findMany({
    where: { AND: [{ participants: { some: { userId } } }, { participants: { some: { userId: otherId } } }] },
    select: { id: true, _count: { select: { participants: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return candidates.find((c) => c._count.participants === 2)?.id ?? null;
}

export async function unreadMessagesCount(user: CurrentUser) {
  const parts = await db.conversationParticipant.findMany({ where: { userId: user.id }, select: { conversationId: true, lastReadAt: true } });
  const counts = await Promise.all(
    parts.map((p) => db.message.count({ where: { conversationId: p.conversationId, senderId: { not: user.id }, ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}) } })),
  );
  return counts.reduce((s, n) => s + n, 0);
}

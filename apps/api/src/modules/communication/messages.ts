import type { Prisma } from "@prisma/client";
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
      // Newest page of the thread (reversed below to chronological order).
      messages: { orderBy: { createdAt: "desc" }, take: 300, include: { sender: { select: { id: true, name: true, avatarUrl: true } } } },
    },
  });
  if (!conv) throw new AuthError("NOT_FOUND");
  if (!conv.participants.some((p) => p.userId === user.id)) throw new AuthError("NOT_FOUND");
  const messages = conv.messages.reverse();
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
    db.notification.updateMany({ where: { userId: user.id, type: "MESSAGE", readAt: null, link: `/dashboard/messages?c=${id}` }, data: { readAt: now } }),
  ]);
  return {
    id: conv.id,
    subject: conv.subject,
    others: conv.participants.filter((p) => p.userId !== user.id).map((p) => ({ id: p.user.id, name: p.user.name, avatarUrl: p.user.avatarUrl, roles: p.user.roles.map((r) => r.role.key), lastReadAt: p.lastReadAt })),
    messages,
  };
}

/** Existing one-to-one conversation between two users, if any. */
export async function findDirectConversation(userId: string, otherId: string, tx: Prisma.TransactionClient = db) {
  const candidates = await tx.conversation.findMany({
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

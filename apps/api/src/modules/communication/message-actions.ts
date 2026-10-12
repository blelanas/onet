import { revalidatePath } from "@api/lib/cache";
import { z } from "zod";
import { db } from "@api/lib/db";
import { AuthError, requirePermission } from "@api/lib/auth/guards";
import type { CurrentUser } from "@api/lib/auth/session";
import { formToObject, runAction, zs } from "@api/lib/actions";
import type { NotificationPayload } from "@api/lib/services/notifications";
import { notifyUsers } from "@api/lib/services/notifications";
import { canMessage } from "./contacts";
import { conversationLink, findDirectConversation } from "./messages";

const startSchema = z.object({ to: zs.id, subject: zs.optStr, body: zs.reqStr(4000) });
const sendSchema = z.object({ conversationId: zs.id, body: zs.reqStr(4000) });

/**
 * MESSAGE notifications without spam: each recipient keeps at most one unread notification per
 * conversation. An unread one is refreshed (new title / body, moved to the top) instead of adding
 * another; recipients without one get a new notification (all enabled channels).
 */
export async function notifyConversation(conversationId: string, userIds: string[], payload: Omit<NotificationPayload, "type" | "link">) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return;
  const link = conversationLink(conversationId);
  const unread = await db.notification.findMany({ where: { userId: { in: ids }, type: "MESSAGE", readAt: null, link }, select: { id: true, userId: true }, orderBy: { createdAt: "desc" } });
  const keep = new Map<string, string>();
  for (const n of unread) if (!keep.has(n.userId)) keep.set(n.userId, n.id);
  if (keep.size) {
    const stale = unread.filter((n) => keep.get(n.userId) !== n.id).map((n) => n.id);
    await db.$transaction([
      db.notification.updateMany({ where: { id: { in: [...keep.values()] } }, data: { title: payload.title, body: payload.body ?? null, createdAt: new Date() } }),
      // Older duplicates (from before this rule) are folded into the refreshed one.
      ...(stale.length ? [db.notification.deleteMany({ where: { id: { in: stale } } })] : []),
    ]);
  }
  await notifyUsers(
    ids.filter((id) => !keep.has(id)),
    { type: "MESSAGE", title: payload.title, body: payload.body, link },
  );
}

const excerpt = (body: string) => (body.length > 140 ? `${body.slice(0, 140)}…` : body);

async function postMessage(user: CurrentUser, conversationId: string, body: string, recipients: string[], title: string) {
  const now = new Date();
  await db.$transaction([
    db.message.create({ data: { conversationId, senderId: user.id, body } }),
    db.conversation.update({ where: { id: conversationId }, data: { updatedAt: now } }),
    db.conversationParticipant.update({ where: { conversationId_userId: { conversationId, userId: user.id } }, data: { lastReadAt: now } }),
  ]);
  await notifyConversation(conversationId, recipients, { title, body: excerpt(body) });
  revalidatePath("/dashboard/messages");
}

/**
 * Existing one-to-one thread or a new one. Check + create run in one transaction: SQLite/libSQL serialise
 * writers, so a concurrent first message either sees the other's thread or fails (snapshot conflict) and
 * then picks up the thread that won.
 */
async function directConversation(userId: string, otherId: string) {
  const create = () =>
    db.$transaction(async (tx) => {
      const existing = await findDirectConversation(userId, otherId, tx);
      if (existing) return existing;
      const conv = await tx.conversation.create({ data: { participants: { create: [{ userId, lastReadAt: new Date() }, { userId: otherId }] } } });
      return conv.id;
    });
  try {
    return await create();
  } catch (e) {
    const existing = await findDirectConversation(userId, otherId);
    if (existing) return existing;
    throw e;
  }
}

/** New conversation (or continues the existing one-to-one thread) with an allowed contact. */
export async function startConversation(fd: FormData | Record<string, unknown>) {
  return runAction(startSchema, formToObject(fd), async (d) => {
    const user = await requirePermission("messages.use");
    if (d.to === user.id || !(await canMessage(user, d.to))) throw new AuthError("FORBIDDEN");
    const id = d.subject
      ? (await db.conversation.create({ data: { subject: d.subject, participants: { create: [{ userId: user.id, lastReadAt: new Date() }, { userId: d.to }] } } })).id
      : await directConversation(user.id, d.to);
    await postMessage(user, id, d.body, [d.to], d.subject ? `${user.name} · ${d.subject}` : user.name);
    return { id };
  });
}

/**
 * Reply in a conversation. Sender must be a participant. In a direct thread they must still be allowed
 * to reach every other participant; in a group (or a team chat) membership itself is the permission.
 */
export async function sendMessage(fd: FormData | Record<string, unknown>) {
  return runAction(sendSchema, formToObject(fd), async (d) => {
    const user = await requirePermission("messages.use");
    const conv = await db.conversation.findUnique({
      where: { id: d.conversationId },
      select: { subject: true, kind: true, participants: { select: { userId: true } }, team: { select: { name: true } } },
    });
    if (!conv || !conv.participants.some((p) => p.userId === user.id)) throw new AuthError("NOT_FOUND");
    const others = conv.participants.map((p) => p.userId).filter((id) => id !== user.id);
    const group = conv.kind === "GROUP" || !!conv.team;
    if (!group) for (const o of others) if (!(await canMessage(user, o))) throw new AuthError("FORBIDDEN");
    const name = conv.subject ?? conv.team?.name;
    await postMessage(user, d.conversationId, d.body, others, name ? `${user.name} · ${name}` : user.name);
    return { id: d.conversationId };
  });
}

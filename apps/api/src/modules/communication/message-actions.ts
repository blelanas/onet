import { revalidatePath } from "@api/lib/cache";
import { z } from "zod";
import { db } from "@api/lib/db";
import { AuthError, requirePermission } from "@api/lib/auth/guards";
import type { CurrentUser } from "@api/lib/auth/session";
import { formToObject, runAction, zs } from "@api/lib/actions";
import { notifyUsers } from "@api/lib/services/notifications";
import { canMessage } from "./contacts";
import { findDirectConversation } from "./messages";

const startSchema = z.object({ to: zs.id, subject: zs.optStr, body: zs.reqStr(4000) });
const sendSchema = z.object({ conversationId: zs.id, body: zs.reqStr(4000) });

async function postMessage(user: CurrentUser, conversationId: string, body: string, recipients: string[], subject?: string | null) {
  const now = new Date();
  await db.$transaction([
    db.message.create({ data: { conversationId, senderId: user.id, body } }),
    db.conversation.update({ where: { id: conversationId }, data: { updatedAt: now } }),
    db.conversationParticipant.update({ where: { conversationId_userId: { conversationId, userId: user.id } }, data: { lastReadAt: now } }),
  ]);
  await notifyUsers(recipients, {
    type: "MESSAGE",
    title: subject ? `${user.name} · ${subject}` : user.name,
    body: body.length > 140 ? `${body.slice(0, 140)}…` : body,
    link: `/dashboard/messages?c=${conversationId}`,
  });
  revalidatePath("/dashboard/messages");
}

/** New conversation (or continues the existing one-to-one thread) with an allowed contact. */
export async function startConversation(fd: FormData | Record<string, unknown>) {
  return runAction(startSchema, formToObject(fd), async (d) => {
    const user = await requirePermission("messages.use");
    if (d.to === user.id || !(await canMessage(user, d.to))) throw new AuthError("FORBIDDEN");
    let id = d.subject ? null : await findDirectConversation(user.id, d.to);
    if (!id) {
      const conv = await db.conversation.create({
        data: { subject: d.subject ?? null, participants: { create: [{ userId: user.id, lastReadAt: new Date() }, { userId: d.to }] } },
      });
      id = conv.id;
    }
    await postMessage(user, id, d.body, [d.to], d.subject);
    return { id };
  });
}

/** Reply in a conversation: sender must be a participant and still allowed to reach every other participant. */
export async function sendMessage(fd: FormData | Record<string, unknown>) {
  return runAction(sendSchema, formToObject(fd), async (d) => {
    const user = await requirePermission("messages.use");
    const conv = await db.conversation.findUnique({ where: { id: d.conversationId }, select: { subject: true, participants: { select: { userId: true } } } });
    if (!conv || !conv.participants.some((p) => p.userId === user.id)) throw new AuthError("NOT_FOUND");
    const others = conv.participants.map((p) => p.userId).filter((id) => id !== user.id);
    for (const o of others) if (!(await canMessage(user, o))) throw new AuthError("FORBIDDEN");
    await postMessage(user, d.conversationId, d.body, others, conv.subject);
    return { id: d.conversationId };
  });
}

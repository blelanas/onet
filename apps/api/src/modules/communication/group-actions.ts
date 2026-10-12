import { revalidatePath } from "@api/lib/cache";
import { z } from "zod";
import { db } from "@api/lib/db";
import { getTranslations } from "@api/lib/i18n";
import { AuthError, requirePermission } from "@api/lib/auth/guards";
import type { CurrentUser } from "@api/lib/auth/session";
import { ActionError, formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { notifyLocalized } from "@api/modules/registrations/notify";
import { allowedContacts } from "./contacts";
import { conversationLink, isPlatformAdmin } from "./messages";

/** A group holds its creator plus up to 200 other people. */
export const GROUP_MAX_PARTICIPANTS = 201;

const idList = (max: number) => z.array(zs.id).max(max).optional().transform((v) => [...new Set(v ?? [])]);

const createSchema = z.object({
  title: zs.reqStr(80),
  userIds: z.array(zs.id).min(1, "errors.required").max(200),
});

const updateSchema = z.object({
  id: zs.id,
  title: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), zs.reqStr(80).optional()),
  addUserIds: idList(200),
  removeUserIds: idList(200),
  makeAdminIds: idList(200),
});

/** Domain error rendered in the request language (communication.messages.groups.errors.*). */
async function groupError(key: "teamManaged" | "tooMany" | "notMember"): Promise<never> {
  const t = await getTranslations("communication.messages.groups.errors");
  throw new ActionError(t(key));
}

/** Every requested user must be one of the actor's contacts (same rule as one-to-one messages). */
async function assertContacts(user: CurrentUser, ids: string[]) {
  if (!ids.length) return;
  const contacts = new Set((await allowedContacts(user)).map((c) => c.id));
  if (ids.some((id) => !contacts.has(id))) throw new AuthError("FORBIDDEN");
}

/** Tells people they were added to a group (one notification per conversation, in their language). */
async function notifyAdded(user: CurrentUser, conversationId: string, title: string, userIds: string[]) {
  if (!userIds.length) return;
  const link = conversationLink(conversationId);
  // Keep the "one unread MESSAGE notification per conversation" rule.
  await db.notification.deleteMany({ where: { userId: { in: userIds }, type: "MESSAGE", readAt: null, link } });
  await notifyLocalized(userIds, "MESSAGE", link, (t) => ({ title, body: t("addedBody", { name: user.name, title }) }), "communication.messages.groups.notify");
}

/** New chat group: the creator is its first admin. */
export async function createGroup(fd: FormData | Record<string, unknown>) {
  return runAction(createSchema, formToObject(fd), async (d) => {
    const user = await requirePermission("messages.use");
    const ids = [...new Set(d.userIds)].filter((id) => id !== user.id);
    if (!ids.length) throw new ActionError("errors.validation");
    await assertContacts(user, ids);
    const now = new Date();
    const conv = await db.conversation.create({
      data: {
        kind: "GROUP",
        subject: d.title,
        createdById: user.id,
        participants: { create: [{ userId: user.id, isAdmin: true, lastReadAt: now }, ...ids.map((userId) => ({ userId }))] },
      },
    });
    await audit(user.id, "create", "ChatGroup", conv.id, { title: d.title, participants: ids.length + 1 });
    await notifyAdded(user, conv.id, d.title, ids);
    revalidatePath("/dashboard/messages");
    return { id: conv.id };
  });
}

/** Loads a group the actor may manage: its admins, or a platform admin. Team chats are refused. */
async function loadManagedGroup(user: CurrentUser, id: string) {
  const conv = await db.conversation.findUnique({ where: { id }, select: { id: true, kind: true, subject: true, team: { select: { id: true } }, participants: { select: { userId: true, isAdmin: true } } } });
  const me = conv?.participants.find((p) => p.userId === user.id);
  if (!conv || conv.kind !== "GROUP" || (!me && !isPlatformAdmin(user))) throw new AuthError("NOT_FOUND");
  if (conv.team) await groupError("teamManaged");
  if (!me?.isAdmin && !isPlatformAdmin(user)) throw new AuthError("FORBIDDEN");
  return conv;
}

/** Keeps at least one admin while the group has members (the earliest remaining participant is promoted). */
async function ensureAdmin(conversationId: string) {
  const parts = await db.conversationParticipant.findMany({ where: { conversationId }, select: { userId: true, isAdmin: true } });
  if (parts.length && !parts.some((p) => p.isAdmin)) {
    await db.conversationParticipant.update({ where: { conversationId_userId: { conversationId, userId: parts[0]!.userId } }, data: { isAdmin: true } });
  }
  return parts.length;
}

/** Rename, add / remove people, promote admins (group admins and platform admins). */
export async function updateGroup(fd: FormData | Record<string, unknown>) {
  return runAction(updateSchema, formToObject(fd), async (d) => {
    const user = await requirePermission("messages.use");
    const conv = await loadManagedGroup(user, d.id);
    const current = new Set(conv.participants.map((p) => p.userId));
    const add = d.addUserIds.filter((id) => !current.has(id));
    // Leaving is a separate action: an admin doesn't remove themselves from here.
    const remove = d.removeUserIds.filter((id) => current.has(id) && id !== user.id);
    await assertContacts(user, add.filter((id) => id !== user.id));
    if (add.includes(user.id) && !isPlatformAdmin(user)) throw new AuthError("FORBIDDEN");
    if (current.size + add.length - remove.length > GROUP_MAX_PARTICIPANTS) await groupError("tooMany");
    const after = new Set([...current, ...add].filter((id) => !remove.includes(id)));
    const promote = d.makeAdminIds.filter((id) => after.has(id));
    if (d.makeAdminIds.length !== promote.length) await groupError("notMember");

    const title = d.title ?? conv.subject ?? "";
    await db.$transaction([
      ...(d.title && d.title !== conv.subject ? [db.conversation.update({ where: { id: conv.id }, data: { subject: d.title } })] : []),
      ...(remove.length ? [db.conversationParticipant.deleteMany({ where: { conversationId: conv.id, userId: { in: remove } } })] : []),
      ...(add.length ? [db.conversationParticipant.createMany({ data: add.map((userId) => ({ conversationId: conv.id, userId })) })] : []),
      ...(promote.length ? [db.conversationParticipant.updateMany({ where: { conversationId: conv.id, userId: { in: promote } }, data: { isAdmin: true } })] : []),
    ]);
    await ensureAdmin(conv.id);
    await audit(user.id, "update", "ChatGroup", conv.id, { title: d.title, added: add.length, removed: remove.length, promoted: promote.length });
    await notifyAdded(user, conv.id, title, add.filter((id) => id !== user.id));
    revalidatePath("/dashboard/messages");
    return { id: conv.id };
  });
}

/** Leave a group (not a team chat). The last one out deletes the group. */
export async function leaveGroup(id: string) {
  return runAction(zs.id, id, async (conversationId) => {
    const user = await requirePermission("messages.use");
    const conv = await db.conversation.findUnique({ where: { id: conversationId }, select: { kind: true, team: { select: { id: true } }, participants: { where: { userId: user.id }, select: { userId: true } } } });
    if (!conv || conv.kind !== "GROUP" || !conv.participants.length) throw new AuthError("NOT_FOUND");
    if (conv.team) await groupError("teamManaged");
    await db.conversationParticipant.delete({ where: { conversationId_userId: { conversationId, userId: user.id } } });
    const left = await ensureAdmin(conversationId);
    if (!left) await db.conversation.delete({ where: { id: conversationId } });
    await db.notification.updateMany({ where: { userId: user.id, type: "MESSAGE", readAt: null, link: conversationLink(conversationId) }, data: { readAt: new Date() } });
    await audit(user.id, "leave", "ChatGroup", conversationId);
    revalidatePath("/dashboard/messages");
    return { id: conversationId };
  });
}

"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requirePermission } from "@/lib/auth/guards";
import { getCurrentUser } from "@/lib/auth/session";
import { ActionError, formToObject, runAction, zs } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { notifyRoles } from "@/lib/services/notifications";

async function me() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  return user;
}

export async function markNotificationRead(id: string) {
  return runAction(zs.id, id, async (nid) => {
    const user = await me();
    await db.notification.updateMany({ where: { id: nid, userId: user.id, readAt: null }, data: { readAt: new Date() } });
    revalidatePath("/dashboard", "layout");
  });
}

export async function markNotificationUnread(id: string) {
  return runAction(zs.id, id, async (nid) => {
    const user = await me();
    await db.notification.updateMany({ where: { id: nid, userId: user.id }, data: { readAt: null } });
    revalidatePath("/dashboard", "layout");
  });
}

export async function markAllNotificationsRead() {
  return runAction(z.undefined(), undefined, async () => {
    const user = await me();
    await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
    revalidatePath("/dashboard", "layout");
  });
}

export async function deleteNotification(id: string) {
  return runAction(zs.id, id, async (nid) => {
    const user = await me();
    await db.notification.deleteMany({ where: { id: nid, userId: user.id } });
    revalidatePath("/dashboard", "layout");
  });
}

const broadcastSchema = z.object({
  title: zs.reqStr(160),
  body: zs.optStr,
  link: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(300).regex(/^\/(?![\/\\])/, "errors.validation").optional()),
  roles: z.array(z.string().min(1)).min(1, "errors.required"),
});

/** Sends an in-app notification (plus enabled channels) to every active user of the chosen roles. */
export async function broadcastNotification(fd: FormData) {
  return runAction(broadcastSchema, formToObject(fd), async (d) => {
    const user = await requirePermission("notifications.manage");
    const known = await db.role.findMany({ where: { key: { in: d.roles } }, select: { key: true } });
    if (!known.length) throw new ActionError("errors.validation");
    const roles = known.map((r) => r.key);
    const recipients = await db.user.count({ where: { isActive: true, roles: { some: { role: { key: { in: roles } } } } } });
    await notifyRoles(roles, { type: "SYSTEM", title: d.title, body: d.body, link: d.link });
    await audit(user.id, "broadcast", "Notification", null, { title: d.title, roles, recipients });
    revalidatePath("/dashboard", "layout");
    return { recipients };
  });
}

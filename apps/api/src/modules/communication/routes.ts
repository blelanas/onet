import { Router, type Request } from "express";
import { db } from "@api/lib/db";
import { can, requirePermission, requireUser } from "@api/lib/auth/guards";
import { mutation, param, qs, query } from "@api/lib/http";
import { isKidOnly } from "./audience";
import { announcementGroupOptions, listAnnouncements } from "./announcements";
import { deleteAnnouncement, saveAnnouncement, togglePin } from "./announcement-actions";
import { allowedContacts } from "./contacts";
import { findDirectConversation, listConversations, openConversation } from "./messages";
import { sendMessage, startConversation } from "./message-actions";
import { listNotifications, roleOptions } from "./notifications";
import { broadcastNotification, deleteNotification, markAllNotificationsRead, markNotificationRead, markNotificationUnread } from "./notification-actions";

/** communication module routes (mounted under /api). */
export const router = Router();

function pageOf(req: Request, size: number) {
  const page = Math.max(1, Number(qs(req, "page")) || 1);
  return { page, pageSize: size, skip: (page - 1) * size, take: size };
}

// ─── Announcements ──────────────────────────────────────────────────────────

/** Announcements visible to the user (audience-filtered). Kids get the simplified feed. */
export async function announcementsPage(req: Request) {
  const user = await requirePermission("announcements.read");
  if (isKidOnly(user)) {
    const { rows } = await listAnnouncements(user, { take: 30 });
    return { kid: true as const, rows, total: rows.length, page: 1, pageSize: 30, canManage: false, groups: [] as { id: string; name: string; color: string }[] };
  }
  const canManage = can(user, "announcements.manage");
  const { page, pageSize, skip, take } = pageOf(req, 10);
  const [{ rows, total }, groups] = await Promise.all([
    listAnnouncements(user, {
      q: qs(req, "q"),
      priority: qs(req, "priority"),
      audience: canManage ? qs(req, "audience") : undefined,
      expired: canManage && qs(req, "view") === "expired",
      skip,
      take,
    }),
    canManage ? announcementGroupOptions() : Promise.resolve([]),
  ]);
  return { kid: false as const, rows, total, page, pageSize, canManage, groups };
}
router.get("/announcements", query(announcementsPage));
router.post("/announcements", mutation((req) => saveAnnouncement(req.body)));
router.post("/announcements/:id/pin", mutation((req) => togglePin(param(req, "id"))));
router.delete("/announcements/:id", mutation((req) => deleteAnnouncement(param(req, "id"))));

// ─── Messages ───────────────────────────────────────────────────────────────

/**
 * Messaging page: allowed contacts, conversations (+ unread), the open thread (?c=, marks it read)
 * and, for ?to=<userId>, the existing one-to-one thread to continue (`redirectTo`).
 */
export async function messagesPage(req: Request) {
  const user = await requirePermission("messages.use");
  const c = qs(req, "c");
  const to = qs(req, "to");
  const contacts = await allowedContacts(user);
  const contactIds = new Set(contacts.map((x) => x.id));
  if (!c && to && contactIds.has(to)) {
    const existing = await findDirectConversation(user.id, to);
    if (existing) return { redirectTo: existing, meId: user.id, contacts, conversations: [], thread: null, canReply: false, totalUnread: 0, toAllowed: true };
  }
  const [conversations, thread] = await Promise.all([listConversations(user, qs(req, "q")), c ? openConversation(user, c) : Promise.resolve(null)]);
  return {
    redirectTo: null as string | null,
    meId: user.id,
    contacts,
    conversations,
    thread,
    canReply: !!thread && thread.others.every((o) => contactIds.has(o.id)),
    totalUnread: conversations.reduce((s, x) => s + x.unread, 0),
    toAllowed: !to || contactIds.has(to),
  };
}
router.get("/messages", query(messagesPage));
router.post("/messages/conversations", mutation((req) => startConversation(req.body)));
router.post("/messages", mutation((req) => sendMessage(req.body)));

// ─── Notifications ──────────────────────────────────────────────────────────

export async function notificationsPage(req: Request) {
  const user = await requireUser();
  const { page, pageSize, skip, take } = pageOf(req, 25);
  const canBroadcast = can(user, "notifications.manage");
  const [{ rows, total, unread }, roles] = await Promise.all([
    listNotifications(user, { unread: qs(req, "filter") === "unread", type: qs(req, "type"), skip, take }),
    canBroadcast ? roleOptions() : Promise.resolve([]),
  ]);
  return { rows, total, unread, page, pageSize, canBroadcast, canSettings: can(user, "settings.manage"), roles: roles.map((r) => ({ key: r.key, name: r.name, color: r.color, users: r._count.users })) };
}
router.get("/notifications", query(notificationsPage));
router.post("/notifications/read-all", mutation(() => markAllNotificationsRead()));
router.post("/notifications/broadcast", mutation((req) => broadcastNotification(req.body)));

/** Click on a notification: mark it read (own notifications only) and return its internal link. */
router.post(
  "/notifications/:id/open",
  mutation(async (req) => {
    const user = await requireUser();
    const id = param(req, "id");
    const n = await db.notification.findFirst({ where: { id, userId: user.id } });
    if (!n) return { ok: true, data: { link: "/dashboard/notifications" } };
    if (!n.readAt) await db.notification.update({ where: { id }, data: { readAt: new Date() } });
    // Only same-origin paths are followed (no open redirect).
    const link = n.link && /^\/(?![/\\])/.test(n.link) ? n.link : "/dashboard/notifications";
    return { ok: true, data: { link } };
  }),
);
router.post("/notifications/:id/read", mutation((req) => markNotificationRead(param(req, "id"))));
router.post("/notifications/:id/unread", mutation((req) => markNotificationUnread(param(req, "id"))));
router.delete("/notifications/:id", mutation((req) => deleteNotification(param(req, "id"))));

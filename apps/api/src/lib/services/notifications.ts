import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@api/lib/db";
import type { NotificationChannel, NotificationType } from "@api/lib/constants";

/** The Prisma client, or the caller's transaction (notifications written with the change they announce). */
export type NotifyClient = PrismaClient | Prisma.TransactionClient;

export type NotificationPayload = {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
};

/**
 * Channel adapters. IN_APP persists to the Notification table; EMAIL / SMS / PUSH are stubs
 * that log for now — plug a provider (SMTP, Twilio/Ooredoo, FCM/WebPush) by implementing `send`.
 */
interface ChannelAdapter {
  channel: NotificationChannel;
  send(userIds: string[], payload: NotificationPayload, client: NotifyClient): Promise<void>;
}

const inApp: ChannelAdapter = {
  channel: "IN_APP",
  async send(userIds, p, client) {
    if (!userIds.length) return;
    await client.notification.createMany({
      data: userIds.map((userId) => ({ userId, type: p.type, title: p.title, body: p.body, link: p.link, channel: "IN_APP" })),
    });
  },
};

const logOnly = (channel: NotificationChannel): ChannelAdapter => ({
  channel,
  async send(userIds, p) {
    if (process.env.NODE_ENV === "development") console.info(`[notify:${channel}] → ${userIds.length} user(s): ${p.title}`);
  },
});

const ADAPTERS: Record<NotificationChannel, ChannelAdapter> = {
  IN_APP: inApp,
  EMAIL: logOnly("EMAIL"),
  SMS: logOnly("SMS"),
  PUSH: logOnly("PUSH"),
};

async function enabledChannels(client: NotifyClient): Promise<NotificationChannel[]> {
  const s = await client.setting.findUnique({ where: { key: "notifications.channels" } });
  const parsed = s ? (JSON.parse(s.value) as NotificationChannel[]) : null;
  return parsed?.length ? Array.from(new Set<NotificationChannel>(["IN_APP", ...parsed])) : ["IN_APP"];
}

/**
 * `client`: pass the transaction when the notifications must be written together with the change they
 * announce (inside a transaction, every query must go through it).
 */
export async function notifyUsers(userIds: string[], payload: NotificationPayload, client: NotifyClient = db) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return;
  const channels = await enabledChannels(client);
  for (const c of channels) await ADAPTERS[c].send(unique, payload, client);
}

/** Notify the login accounts of the guardians of a child (and the child's own account). */
export async function notifyGuardians(childId: string, payload: NotificationPayload, includeChild = false) {
  const links = await db.guardianship.findMany({
    where: { childId },
    select: { parent: { select: { userId: true } }, child: { select: { userId: true } } },
  });
  const ids = links.map((l) => l.parent.userId).filter((x): x is string => !!x);
  if (includeChild && links[0]?.child.userId) ids.push(links[0].child.userId);
  await notifyUsers(ids, payload);
}

/** Notify all active users having one of the given roles. */
export async function notifyRoles(roleKeys: string[], payload: NotificationPayload) {
  const users = await db.user.findMany({
    where: { isActive: true, roles: { some: { role: { key: { in: roleKeys } } } } },
    select: { id: true },
  });
  await notifyUsers(users.map((u) => u.id), payload);
}

import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";

export async function listNotifications(user: CurrentUser, f: { unread?: boolean; type?: string; skip?: number; take?: number }) {
  const where: Prisma.NotificationWhereInput = { userId: user.id, ...(f.unread ? { readAt: null } : {}), ...(f.type ? { type: f.type } : {}) };
  const [rows, total, unread] = await Promise.all([
    db.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip: f.skip, take: f.take }),
    db.notification.count({ where }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  return { rows, total, unread };
}

export async function roleOptions() {
  return db.role.findMany({ orderBy: { createdAt: "asc" }, select: { key: true, name: true, color: true, isSystem: true, _count: { select: { users: true } } } });
}

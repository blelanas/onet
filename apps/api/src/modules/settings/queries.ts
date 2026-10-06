import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";

export async function listUsers(f: { q?: string; role?: string; status?: string; skip?: number; take?: number }) {
  const where: Prisma.UserWhereInput = {
    AND: [
      f.q ? { OR: [{ name: { contains: f.q } }, { email: { contains: f.q } }, { phone: { contains: f.q } }] } : {},
      f.role ? { roles: { some: { role: { key: f.role } } } } : {},
      f.status === "active" ? { isActive: true } : f.status === "inactive" ? { isActive: false } : {},
    ],
  };
  const [rows, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      skip: f.skip,
      take: f.take,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        member: { select: { id: true, type: true } },
        roles: { select: { role: { select: { id: true, key: true, name: true, color: true, isSystem: true } } } },
      },
    }),
    db.user.count({ where }),
  ]);
  return { rows, total };
}

export async function listRoles() {
  return db.role.findMany({
    orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
    include: { permissions: { select: { permission: { select: { key: true } } } }, _count: { select: { users: true } } },
  });
}

export async function listPermissions() {
  return db.permission.findMany({ orderBy: [{ module: "asc" }, { key: "asc" }] });
}

export async function listAuditLogs(f: { userId?: string; action?: string; entity?: string; q?: string; skip?: number; take?: number }) {
  const where: Prisma.AuditLogWhereInput = {
    ...(f.userId ? { userId: f.userId } : {}),
    ...(f.action ? { action: f.action } : {}),
    ...(f.entity ? { entity: f.entity } : {}),
    ...(f.q ? { OR: [{ entityId: { contains: f.q } }, { details: { contains: f.q } }] } : {}),
  };
  const [rows, total, actions, entities, users] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: f.skip, take: f.take, include: { user: { select: { id: true, name: true, email: true } } } }),
    db.auditLog.count({ where }),
    db.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    db.auditLog.findMany({ distinct: ["entity"], select: { entity: true }, orderBy: { entity: "asc" } }),
    db.auditLog.findMany({ distinct: ["userId"], where: { userId: { not: null } }, select: { user: { select: { id: true, name: true } } } }),
  ]);
  return {
    rows,
    total,
    actions: actions.map((a) => a.action),
    entities: entities.map((e) => e.entity),
    users: users.map((u) => u.user).filter((u): u is { id: string; name: string } => !!u).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function listContactMessages(f: { status?: string; skip?: number; take?: number }) {
  const where: Prisma.ContactMessageWhereInput = f.status === "unread" ? { isRead: false } : f.status === "read" ? { isRead: true } : {};
  const [rows, total, unread] = await Promise.all([
    db.contactMessage.findMany({ where, orderBy: { createdAt: "desc" }, skip: f.skip, take: f.take }),
    db.contactMessage.count({ where }),
    db.contactMessage.count({ where: { isRead: false } }),
  ]);
  return { rows, total, unread };
}

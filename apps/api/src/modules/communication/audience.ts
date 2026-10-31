import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { myChildren, myGroupIds } from "@api/lib/auth/scope";

export const STAFF_ROLES = ["super_admin", "admin", "accountant"] as const;

export function isStaffRoles(roles: readonly string[]) {
  return roles.some((r) => (STAFF_ROLES as readonly string[]).includes(r));
}

export function isStaff(user: Pick<CurrentUser, "roles">) {
  return isStaffRoles(user.roles);
}

export function isKidOnly(user: Pick<CurrentUser, "roles">) {
  return user.roles.includes("kid") && user.roles.every((r) => r === "kid");
}

/** Groups an announcement of audience GROUP may target for this user. */
async function relevantGroupIds(user: CurrentUser) {
  const ids = new Set<string>(await myGroupIds(user));
  for (const c of await myChildren(user)) if (c.groupId) ids.add(c.groupId);
  if (user.memberId) {
    const me = await db.member.findUnique({ where: { id: user.memberId }, select: { groupId: true } });
    if (me?.groupId) ids.add(me.groupId);
  }
  return [...ids];
}

/**
 * Prisma filter: announcements visible to this user (audience + publication window).
 * Staff see every audience; managers may additionally include expired announcements.
 */
export async function announcementWhere(user: CurrentUser, opts: { includeExpired?: boolean } = {}): Promise<Prisma.AnnouncementWhereInput> {
  const now = new Date();
  const notExpired: Prisma.AnnouncementWhereInput = { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
  if (user.permissions.has("announcements.manage")) return opts.includeExpired ? {} : notExpired;
  if (isStaff(user)) return { AND: [notExpired, { publishedAt: { lte: now } }] };
  const audiences: Prisma.AnnouncementWhereInput[] = [{ audience: "ALL" }];
  if (user.roles.includes("parent")) audiences.push({ audience: "PARENTS" });
  if (user.roles.includes("monitor")) audiences.push({ audience: "MONITORS" });
  if (user.roles.includes("kid")) audiences.push({ audience: "KIDS" });
  const groups = await relevantGroupIds(user);
  if (groups.length) audiences.push({ audience: "GROUP", groupId: { in: groups } });
  return { AND: [notExpired, { publishedAt: { lte: now } }, { OR: audiences }] };
}

const ROLE_FOR_AUDIENCE: Record<string, string[]> = {
  PARENTS: ["parent"],
  MONITORS: ["monitor"],
  KIDS: ["kid"],
  STAFF: [...STAFF_ROLES],
};

/** Active user ids targeted by an announcement (used for notifications). */
export async function audienceUserIds(audience: string, groupId?: string | null): Promise<string[]> {
  if (audience === "ALL") return (await db.user.findMany({ where: { isActive: true, status: "ACTIVE" }, select: { id: true } })).map((u) => u.id);
  if (audience === "GROUP") {
    if (!groupId) return [];
    const group = await db.group.findUnique({
      where: { id: groupId },
      select: {
        children: { select: { userId: true, parentLinks: { select: { parent: { select: { userId: true } } } } } },
        monitors: { select: { member: { select: { userId: true } } } },
      },
    });
    if (!group) return [];
    const ids = new Set<string>();
    for (const c of group.children) {
      if (c.userId) ids.add(c.userId);
      for (const p of c.parentLinks) if (p.parent.userId) ids.add(p.parent.userId);
    }
    for (const m of group.monitors) if (m.member.userId) ids.add(m.member.userId);
    const active = await db.user.findMany({ where: { id: { in: [...ids] }, isActive: true }, select: { id: true } });
    return active.map((u) => u.id);
  }
  const roles = ROLE_FOR_AUDIENCE[audience] ?? [];
  const users = await db.user.findMany({ where: { isActive: true, roles: { some: { role: { key: { in: roles } } } } }, select: { id: true } });
  return users.map((u) => u.id);
}

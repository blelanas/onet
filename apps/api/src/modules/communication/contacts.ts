import { requestCache } from "@api/lib/context";
import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { isStaff, isStaffRoles } from "./audience";

export type Contact = {
  id: string;
  name: string;
  avatarUrl: string | null;
  roles: string[];
  /** Why this contact is offered: staff, a fellow member / monitor, the monitor or the parent of a child… */
  kind: "STAFF" | "MONITOR" | "MEMBER" | "PARENT" | "OTHER";
  /** Children linking the two users (first names), for context in the picker. */
  via: string[];
};

/** Members (= monitors / animators) and monitors may reach each other and form groups. */
export function isPeerRoles(roles: readonly string[]) {
  return roles.includes("member") || roles.includes("monitor");
}

/** Active, approved users allowed to use messaging (holding messages.use through any of their roles). */
async function messagingUsers() {
  const users = await db.user.findMany({
    // Pending / rejected sign-ups are never contacts (they hold no role anyway, but be explicit).
    where: { isActive: true, status: "ACTIVE", roles: { some: { role: { permissions: { some: { permission: { key: "messages.use" } } } } } } },
    select: { id: true, name: true, avatarUrl: true, roles: { select: { role: { select: { key: true } } } } },
    orderBy: { name: "asc" },
  });
  return users.map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl, roles: u.roles.map((r) => r.role.key) }));
}

/**
 * Messaging policy (same rule enforced for listing, creating and sending):
 *  - staff (super_admin / admin / accountant) ↔ anyone
 *  - member / monitor ↔ staff + every other member / monitor (they can also form groups together)
 *  - monitor ↔ parents of children in their groups
 *  - parent  ↔ staff + monitors of their children's groups
 *  - kids cannot message (no messages.use)
 * Pending / rejected accounts are never contacts.
 */
export const allowedContacts = requestCache("allowedContacts", async (user: CurrentUser): Promise<Contact[]> => {
  if (!user.permissions.has("messages.use")) return [];
  const users = (await messagingUsers()).filter((u) => u.id !== user.id);
  const kindOf = (roles: string[]): Contact["kind"] =>
    isStaffRoles(roles) ? "STAFF" : roles.includes("monitor") ? "MONITOR" : roles.includes("member") ? "MEMBER" : roles.includes("parent") ? "PARENT" : "OTHER";

  if (isStaff(user)) return users.map((u) => ({ ...u, kind: kindOf(u.roles), via: [] }));

  const via = new Map<string, Set<string>>();
  const add = (userId: string | null, child: string) => {
    if (!userId) return;
    if (!via.has(userId)) via.set(userId, new Set());
    via.get(userId)!.add(child);
  };

  if (user.memberId && user.roles.includes("monitor")) {
    // Parents of the children in the groups I monitor.
    const groups = await db.groupMonitor.findMany({
      where: { memberId: user.memberId },
      select: { group: { select: { children: { select: { firstName: true, parentLinks: { select: { parent: { select: { userId: true } } } } } } } } },
    });
    for (const g of groups) for (const c of g.group.children) for (const p of c.parentLinks) add(p.parent.userId, c.firstName);
  }
  if (user.memberId && user.roles.includes("parent")) {
    // Monitors of my children's groups.
    const kids = await db.guardianship.findMany({
      where: { parentId: user.memberId },
      select: { child: { select: { firstName: true, group: { select: { monitors: { select: { member: { select: { userId: true } } } } } } } } },
    });
    for (const k of kids) for (const m of k.child.group?.monitors ?? []) add(m.member.userId, k.child.firstName);
  }

  const peer = isPeerRoles(user.roles);
  return users
    .filter((u) => {
      if (isStaffRoles(u.roles)) return true;
      if (peer && isPeerRoles(u.roles)) return true;
      if (!via.has(u.id)) return false;
      // The link must match the counterpart's role (monitor ↔ parent).
      return (user.roles.includes("monitor") && u.roles.includes("parent")) || (user.roles.includes("parent") && u.roles.includes("monitor"));
    })
    .map((u) => ({ ...u, kind: kindOf(u.roles), via: [...(via.get(u.id) ?? [])] }));
});

export async function canMessage(user: CurrentUser, otherUserId: string) {
  const contacts = await allowedContacts(user);
  return contacts.some((c) => c.id === otherUserId);
}

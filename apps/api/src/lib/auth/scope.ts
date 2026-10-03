import { requestCache } from "@api/lib/context";
import { db } from "@api/lib/db";
import type { CurrentUser } from "./session";
import { AuthError } from "./guards";

/**
 * Data isolation. Returns the set of Member ids the user may see, or "all".
 *  - members.read_all → everything
 *  - parent → own member + their children
 *  - monitor → own member + children of groups they monitor + children of trips they supervise
 *  - kid / member → only themselves
 */
export const visibleMemberIds = requestCache("visibleMemberIds", async (user: CurrentUser): Promise<"all" | string[]> => {
  if (user.permissions.has("members.read_all")) return "all";
  const ids = new Set<string>();
  if (!user.memberId) return [];
  ids.add(user.memberId);

  const [children, groups, trips] = await Promise.all([
    db.guardianship.findMany({ where: { parentId: user.memberId }, select: { childId: true } }),
    db.groupMonitor.findMany({
      where: { memberId: user.memberId },
      select: { group: { select: { children: { select: { id: true } } } } },
    }),
    db.tripMonitor.findMany({
      where: { memberId: user.memberId },
      select: { trip: { select: { registrations: { select: { memberId: true } } } } },
    }),
  ]);
  children.forEach((c) => ids.add(c.childId));
  groups.forEach((g) => g.group.children.forEach((c) => ids.add(c.id)));
  trips.forEach((t) => t.trip.registrations.forEach((r) => ids.add(r.memberId)));
  return [...ids];
});

/** Prisma `where` fragment restricting Member rows to the visible set. */
export async function memberScopeWhere(user: CurrentUser) {
  const ids = await visibleMemberIds(user);
  return ids === "all" ? {} : { id: { in: ids } };
}

export async function assertCanSeeMember(user: CurrentUser, memberId: string) {
  const ids = await visibleMemberIds(user);
  if (ids !== "all" && !ids.includes(memberId)) throw new AuthError("FORBIDDEN");
}

/** Children of the current parent (empty for non-parents). */
export const myChildren = requestCache("myChildren", async (user: CurrentUser) => {
  if (!user.memberId) return [];
  const links = await db.guardianship.findMany({
    where: { parentId: user.memberId },
    include: { child: { include: { group: true } } },
    orderBy: { child: { dateOfBirth: "desc" } },
  });
  return links.map((l) => l.child);
});

/** Group ids the user monitors. */
export const myGroupIds = requestCache("myGroupIds", async (user: CurrentUser) => {
  if (!user.memberId) return [];
  const rows = await db.groupMonitor.findMany({ where: { memberId: user.memberId }, select: { groupId: true } });
  return rows.map((r) => r.groupId);
});

/**
 * Members the user may register for an event/trip: themselves (if member/parent with a member
 * record and not a kid) plus their children. Staff with registrations.manage may register anyone.
 */
export async function registrableMemberIds(user: CurrentUser): Promise<"all" | string[]> {
  if (user.permissions.has("registrations.manage")) return "all";
  const kids = await myChildren(user);
  const ids = kids.map((k) => k.id);
  if (user.memberId && !user.roles.includes("kid")) ids.push(user.memberId);
  return ids;
}

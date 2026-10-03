import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import { ageFrom } from "@api/lib/utils";

type GroupLite = { id: string; name: string; color: string; ageMin: number | null; ageMax: number | null };

/** Best group for an age: active group whose range contains it (narrowest range first). */
export function groupForAge<G extends GroupLite>(groups: G[], age: number | null): G | null {
  if (age == null) return null;
  return (
    groups
      .filter((g) => (g.ageMin ?? 0) <= age && age <= (g.ageMax ?? 99))
      .sort((a, b) => (a.ageMax ?? 99) - (a.ageMin ?? 0) - ((b.ageMax ?? 99) - (b.ageMin ?? 0)))[0] ?? null
  );
}

/** Active groups with a `full` flag (children count reached capacity, as enforced by addChildToGroup). */
export async function activeGroupsWithCapacity(tx: Prisma.TransactionClient = db) {
  const groups = await tx.group.findMany({
    where: { isActive: true },
    orderBy: { ageMin: "asc" },
    select: { id: true, name: true, color: true, ageMin: true, ageMax: true, capacity: true, _count: { select: { children: true } } },
  });
  return groups.map(({ capacity, _count, ...g }) => ({ ...g, full: _count.children >= capacity }));
}

export async function listJoinRequests(tab: "pending" | "processed", skip: number, take: number) {
  const where = tab === "pending" ? { status: "PENDING" } : { status: { in: ["APPROVED", "REJECTED"] } };
  const [rows, total, counts, groups] = await Promise.all([
    db.joinRequest.findMany({ where, orderBy: tab === "pending" ? { createdAt: "asc" } : { processedAt: "desc" }, skip, take }),
    db.joinRequest.count({ where }),
    db.joinRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    activeGroupsWithCapacity(),
  ]);
  // Existing parent records with the same e-mail (the child will be linked to them on approval).
  const emails = rows.map((r) => r.email.toLowerCase());
  const existing = await db.member.findMany({ where: { email: { in: emails }, type: { in: ["PARENT", "MEMBER", "STAFF", "MONITOR"] } }, select: { id: true, email: true } });
  const byEmail = new Map(existing.map((m) => [m.email!.toLowerCase(), m.id]));
  const pending = counts.find((c) => c.status === "PENDING")?._count._all ?? 0;
  const open = groups.filter((g) => !g.full);
  const processed = counts.filter((c) => c.status !== "PENDING").reduce((s, c) => s + c._count._all, 0);
  return {
    rows: rows.map((r) => {
      const age = ageFrom(r.childDob);
      return { ...r, age, suggested: groupForAge(open, age), existingParentId: byEmail.get(r.email.toLowerCase()) ?? null };
    }),
    total,
    pending,
    processed,
    groups,
  };
}

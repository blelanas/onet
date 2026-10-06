import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import { requirePermission } from "@api/lib/auth/guards";
import { allowedAudiences } from "./shared";

export type ResourceFilters = { q?: string; type?: string; audience?: string; category?: string };

/** Resources visible to the current user (audience enforced server-side). */
export async function listResources(f: ResourceFilters) {
  const user = await requirePermission("content.read");
  const allowed = allowedAudiences(user);
  const and: Prisma.ResourceWhereInput[] = [];
  if (allowed !== "all") and.push({ audience: { in: allowed } });
  if (f.audience) and.push({ audience: f.audience });
  if (f.type) and.push({ type: f.type });
  if (f.category) and.push({ category: f.category });
  if (f.q) {
    const q = f.q.slice(0, 100);
    and.push({ OR: [{ title: { contains: q } }, { description: { contains: q } }, { category: { contains: q } }] });
  }
  const rows = await db.resource.findMany({ where: and.length ? { AND: and } : {}, orderBy: [{ category: "asc" }, { title: "asc" }], take: 300 });
  return { rows, canManage: allowed === "all" };
}

export type ResourceItem = Awaited<ReturnType<typeof listResources>>["rows"][number];

/** Existing categories (for the form's suggestions). */
export async function resourceCategories() {
  const rows = await db.resource.findMany({ where: { category: { not: null } }, select: { category: true }, distinct: ["category"], orderBy: { category: "asc" } });
  return rows.map((r) => r.category!).filter(Boolean);
}

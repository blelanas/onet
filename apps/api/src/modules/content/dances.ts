import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import { AuthError, requirePermission } from "@api/lib/auth/guards";
import { AGE_GROUPS, DANCE_CATEGORIES } from "@api/lib/constants";

export type DanceFilters = { q?: string; category?: string; ageGroup?: string; skip?: number; take?: number };

function danceWhere(f: DanceFilters): Prisma.DanceWhereInput {
  const and: Prisma.DanceWhereInput[] = [];
  if (f.category && (DANCE_CATEGORIES as readonly string[]).includes(f.category)) and.push({ category: f.category });
  // A dance for all ages fits every age group.
  if (f.ageGroup && (AGE_GROUPS as readonly string[]).includes(f.ageGroup)) and.push({ ageGroup: f.ageGroup === "ALL" ? "ALL" : { in: [f.ageGroup, "ALL"] } });
  if (f.q) {
    const q = f.q.slice(0, 100);
    and.push({ OR: [{ title: { contains: q } }, { description: { contains: q } }, { steps: { contains: q } }] });
  }
  return and.length ? { AND: and } : {};
}

export async function listDances(f: DanceFilters) {
  await requirePermission("content.read");
  const where = danceWhere(f);
  const [rows, total] = await Promise.all([
    db.dance.findMany({
      where,
      select: { id: true, title: true, description: true, category: true, ageGroup: true, durationMin: true, imageUrl: true, audioUrl: true, videoUrl: true, isPublic: true },
      orderBy: { title: "asc" },
      skip: f.skip,
      take: f.take,
    }),
    db.dance.count({ where }),
  ]);
  return { rows, total };
}

export async function getDance(id: string) {
  await requirePermission("content.read");
  const d = await db.dance.findUnique({ where: { id } });
  if (!d) throw new AuthError("NOT_FOUND");
  return d;
}

/** Steps are stored one per line; numbering or bullets typed by hand are dropped (the page numbers them). */
export function danceSteps(steps?: string | null): string[] {
  if (!steps) return [];
  return steps
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^(\d+[.)-]|[-•*])\s*/, "").trim())
    .filter(Boolean);
}

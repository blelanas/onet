import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission, AuthError } from "@/lib/auth/guards";

export type SongFilters = { q?: string; category?: string; age?: string; lang?: string; skip?: number; take?: number };

function songWhere(f: SongFilters): Prisma.SongWhereInput {
  const where: Prisma.SongWhereInput = {};
  if (f.category) where.category = f.category;
  // "ALL" songs suit every age group, so they stay visible when filtering by age.
  if (f.age) where.ageGroup = f.age === "ALL" ? "ALL" : { in: [f.age, "ALL"] };
  if (f.lang) where.language = f.lang;
  if (f.q) {
    const q = f.q.slice(0, 100);
    where.OR = [{ title: { contains: q } }, { lyrics: { contains: q } }, { author: { contains: q } }, { tags: { contains: q } }];
  }
  return where;
}

const listSelect = { id: true, title: true, category: true, ageGroup: true, author: true, language: true, audioUrl: true, coverUrl: true, durationSec: true, featured: true, plays: true, tags: true, isPublic: true } as const;

export async function listSongs(f: SongFilters) {
  await requirePermission("content.read");
  const where = songWhere(f);
  const [rows, total] = await Promise.all([
    db.song.findMany({ where, select: listSelect, orderBy: [{ featured: "desc" }, { plays: "desc" }, { title: "asc" }], skip: f.skip, take: f.take }),
    db.song.count({ where }),
  ]);
  return { rows, total };
}

export async function featuredSongs() {
  await requirePermission("content.read");
  return db.song.findMany({ where: { featured: true }, select: listSelect, orderBy: { updatedAt: "desc" }, take: 8 });
}

export async function topSongs(take = 5) {
  await requirePermission("content.read");
  return db.song.findMany({ select: listSelect, orderBy: { plays: "desc" }, take });
}

export async function getSong(id: string) {
  await requirePermission("content.read");
  const song = await db.song.findUnique({ where: { id } });
  if (!song) throw new AuthError("NOT_FOUND");
  return song;
}

/** Songs to queue after this one: same category first, then the most played. */
export async function relatedSongs(song: { id: string; category: string }, take = 6) {
  const same = await db.song.findMany({ where: { category: song.category, id: { not: song.id } }, select: listSelect, orderBy: { plays: "desc" }, take });
  if (same.length >= take) return same;
  const others = await db.song.findMany({ where: { id: { notIn: [song.id, ...same.map((s) => s.id)] } }, select: listSelect, orderBy: { plays: "desc" }, take: take - same.length });
  return [...same, ...others];
}

export type SongListItem = Awaited<ReturnType<typeof listSongs>>["rows"][number];

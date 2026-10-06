import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import { AuthError, requirePermission } from "@api/lib/auth/guards";

export type GameFilters = { q?: string; category?: string; age?: string; players?: number; duration?: string; skip?: number; take?: number };

export const GAME_PLAYER_OPTIONS = [2, 5, 10, 20, 30] as const;
export const GAME_DURATIONS = ["short", "medium", "long"] as const;

function gameWhere(f: GameFilters): Prisma.GameWhereInput {
  const and: Prisma.GameWhereInput[] = [];
  if (f.category) and.push({ category: f.category });
  if (f.age) and.push({ ageGroup: f.age === "ALL" ? "ALL" : { in: [f.age, "ALL"] } });
  if (f.players && Number.isFinite(f.players)) {
    and.push({ minPlayers: { lte: f.players } }, { OR: [{ maxPlayers: null }, { maxPlayers: { gte: f.players } }] });
  }
  if (f.duration === "short") and.push({ durationMin: { lte: 15 } });
  if (f.duration === "medium") and.push({ durationMin: { gt: 15, lte: 30 } });
  if (f.duration === "long") and.push({ durationMin: { gt: 30 } });
  if (f.q) {
    const q = f.q.slice(0, 100);
    and.push({ OR: [{ name: { contains: q } }, { description: { contains: q } }, { materials: { contains: q } }, { rules: { contains: q } }] });
  }
  return and.length ? { AND: and } : {};
}

export async function listGames(f: GameFilters) {
  await requirePermission("content.read");
  const where = gameWhere(f);
  const [rows, total] = await Promise.all([
    db.game.findMany({
      where,
      select: { id: true, name: true, description: true, category: true, ageGroup: true, minPlayers: true, maxPlayers: true, durationMin: true, imageUrl: true, isPublic: true },
      orderBy: { name: "asc" },
      skip: f.skip,
      take: f.take,
    }),
    db.game.count({ where }),
  ]);
  return { rows, total };
}

export async function getGame(id: string) {
  await requirePermission("content.read");
  const g = await db.game.findUnique({ where: { id } });
  if (!g) throw new AuthError("NOT_FOUND");
  return g;
}

/** Splits free-text rules into steps: one per line, or one per sentence for a single paragraph. */
export function ruleSteps(rules?: string | null): string[] {
  if (!rules) return [];
  const lines = rules.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const steps = lines.length > 1 ? lines : (lines[0] ?? "").split(/(?<=[.!?؟])\s+(?=\S)/);
  return steps.map((s) => s.replace(/^(\d+[.)-]|[-•*])\s*/, "").trim()).filter(Boolean);
}

export function materialItems(materials?: string | null): string[] {
  if (!materials) return [];
  const items = materials.split(/[,،;\n]/).map((m) => m.trim()).filter(Boolean);
  return items.filter((m) => !/^(aucun|none|rien|لا شيء|-)$/i.test(m)).map((m) => m.charAt(0).toUpperCase() + m.slice(1));
}

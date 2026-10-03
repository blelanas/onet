import { z } from "zod";
import { db } from "@api/lib/db";
import { requirePermission } from "@api/lib/auth/guards";
import { formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { AGE_GROUPS, GAME_CATEGORIES } from "@api/lib/constants";
import { zLocalFile, zMediaUrl } from "./shared";

const gameSchema = z
  .object({
    id: zs.optId,
    name: zs.reqStr(160),
    description: z.string().trim().min(1, "errors.required").max(5000),
    rules: zs.optStr,
    instructions: zs.optStr,
    materials: zs.optStr,
    category: z.enum(GAME_CATEGORIES),
    ageGroup: z.enum(AGE_GROUPS),
    minPlayers: z.preprocess((v) => (v === "" || v == null ? 2 : Number(v)), z.number().int().min(1).max(500)),
    maxPlayers: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(1).max(500).optional()),
    durationMin: z.preprocess((v) => (v === "" || v == null ? 15 : Number(v)), z.number().int().min(1).max(600)),
    imageUrl: zLocalFile,
    videoFile: zLocalFile,
    videoLink: zMediaUrl,
    isPublic: zs.bool,
  })
  .refine((d) => d.maxPlayers == null || d.maxPlayers >= d.minPlayers, { path: ["maxPlayers"], message: "content.games.form.maxLtMin" });

export async function saveGame(fd: FormData | Record<string, unknown>) {
  return runAction(gameSchema, { isPublic: false, ...formToObject(fd) }, async (data) => {
    const user = await requirePermission("content.manage");
    const { id, videoFile, videoLink, ...f } = data;
    const payload = {
      ...f,
      rules: f.rules ?? null,
      instructions: f.instructions ?? null,
      materials: f.materials ?? null,
      maxPlayers: f.maxPlayers ?? null,
      imageUrl: f.imageUrl ?? null,
      videoUrl: videoFile ?? videoLink ?? null,
    };
    const g = id ? await db.game.update({ where: { id }, data: payload }) : await db.game.create({ data: payload });
    await audit(user.id, id ? "update" : "create", "Game", g.id, { name: g.name });
    return { id: g.id };
  });
}

export async function deleteGame(id: string) {
  return runAction(zs.id, id, async (gameId) => {
    const user = await requirePermission("content.manage");
    const g = await db.game.delete({ where: { id: gameId } });
    await audit(user.id, "delete", "Game", gameId, { name: g.name });
  });
}

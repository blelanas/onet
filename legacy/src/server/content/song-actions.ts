"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { formToObject, runAction, zs } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { AGE_GROUPS, SONG_CATEGORIES } from "@/lib/constants";
import { normalizeTags, zLocalFile } from "./shared";

const SONG_LANGUAGES = ["ar", "fr", "en"] as const;

const songSchema = z.object({
  id: zs.optId,
  title: zs.reqStr(160),
  lyrics: z.string().trim().min(1, "errors.required").max(20000),
  audioUrl: zLocalFile,
  coverUrl: zLocalFile,
  category: z.enum(SONG_CATEGORIES),
  ageGroup: z.enum(AGE_GROUPS),
  language: z.enum(SONG_LANGUAGES),
  author: zs.optStr,
  tags: zs.optStr,
  durationSec: z.preprocess((v) => (v === "" || v == null ? undefined : Math.round(Number(v))), z.number().int().min(0).max(36000).optional()),
  featured: zs.bool,
  isPublic: zs.bool,
});

export async function saveSong(fd: FormData) {
  const raw = formToObject(fd);
  return runAction(songSchema, { featured: false, isPublic: false, ...raw }, async (data) => {
    const user = await requirePermission("content.manage");
    const { id, ...f } = data;
    const payload = {
      ...f,
      author: f.author ?? null,
      tags: normalizeTags(f.tags),
      audioUrl: f.audioUrl ?? null,
      coverUrl: f.coverUrl ?? null,
      durationSec: f.durationSec ?? null,
    };
    const song = id ? await db.song.update({ where: { id }, data: payload }) : await db.song.create({ data: payload });
    await audit(user.id, id ? "update" : "create", "Song", song.id, { title: song.title });
    revalidatePath("/dashboard/content/songs", "layout");
    revalidatePath("/songs");
    return { id: song.id };
  });
}

export async function deleteSong(id: string) {
  return runAction(zs.id, id, async (songId) => {
    const user = await requirePermission("content.manage");
    const s = await db.song.delete({ where: { id: songId } });
    await audit(user.id, "delete", "Song", songId, { title: s.title });
    revalidatePath("/dashboard/content/songs", "layout");
    revalidatePath("/songs");
  });
}

/** Called by the player once each time a song starts playing. Returns the new count. */
export async function recordSongPlay(id: string) {
  return runAction(zs.id, id, async (songId) => {
    await requirePermission("content.read");
    const s = await db.song.update({ where: { id: songId }, data: { plays: { increment: 1 } }, select: { plays: true } });
    return { plays: s.plays };
  });
}

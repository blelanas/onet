import { z } from "zod";
import { db } from "@api/lib/db";
import { AuthError, requirePermission } from "@api/lib/auth/guards";
import { formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { AGE_GROUPS, DANCE_CATEGORIES } from "@api/lib/constants";
import { zLocalFile, zMediaUrl } from "./shared";

const danceSchema = z.object({
  id: zs.optId,
  title: zs.reqStr(160),
  description: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : typeof v === "string" ? v.trim() : v), z.string().max(5000).optional()),
  steps: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : typeof v === "string" ? v.trim() : v), z.string().max(10000).optional()),
  category: z.enum(DANCE_CATEGORIES),
  ageGroup: z.enum(AGE_GROUPS),
  durationMin: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(1).max(600).optional()),
  imageUrl: zMediaUrl,
  audioUrl: zMediaUrl,
  // A video is either an uploaded file or a link (YouTube, Vimeo…).
  videoFile: zLocalFile,
  videoLink: zMediaUrl,
  isPublic: zs.bool,
});

export async function saveDance(fd: FormData | Record<string, unknown>) {
  return runAction(danceSchema, { isPublic: false, ...formToObject(fd) }, async (data) => {
    const user = await requirePermission("content.manage");
    const { id, videoFile, videoLink, ...f } = data;
    const payload = {
      ...f,
      description: f.description ?? null,
      steps: f.steps ?? null,
      durationMin: f.durationMin ?? null,
      imageUrl: f.imageUrl ?? null,
      audioUrl: f.audioUrl ?? null,
      videoUrl: videoFile ?? videoLink ?? null,
    };
    if (id && !(await db.dance.findUnique({ where: { id }, select: { id: true } }))) throw new AuthError("NOT_FOUND");
    const d = id ? await db.dance.update({ where: { id }, data: payload }) : await db.dance.create({ data: { ...payload, createdById: user.id } });
    await audit(user.id, id ? "update" : "create", "Dance", d.id, { title: d.title });
    return { id: d.id };
  });
}

export async function deleteDance(id: string) {
  return runAction(zs.id, id, async (danceId) => {
    const user = await requirePermission("content.manage");
    const d = await db.dance.findUnique({ where: { id: danceId }, select: { title: true } });
    if (!d) throw new AuthError("NOT_FOUND");
    await db.dance.delete({ where: { id: danceId } });
    await audit(user.id, "delete", "Dance", danceId, { title: d.title });
  });
}

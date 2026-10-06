import { z } from "zod";
import { db } from "@api/lib/db";
import { requirePermission } from "@api/lib/auth/guards";
import { formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { CONFERENCE_CATEGORIES } from "@api/lib/constants";
import { zLocalFile, zMediaUrl } from "./shared";

const conferenceSchema = z
  .object({
    id: zs.optId,
    title: zs.reqStr(200),
    speaker: zs.reqStr(160),
    speakerBio: zs.optStr,
    description: zs.optStr,
    category: z.enum(CONFERENCE_CATEGORIES),
    date: zs.reqDate,
    location: zs.optStr,
    coverUrl: zLocalFile,
    mediaType: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["AUDIO", "VIDEO"]).optional()),
    audioFile: zLocalFile,
    videoFile: zLocalFile,
    videoLink: zMediaUrl,
    isPublic: zs.bool,
  })
  .transform((d) => ({ ...d, mediaUrl: d.mediaType === "AUDIO" ? d.audioFile : d.mediaType === "VIDEO" ? (d.videoFile ?? d.videoLink) : undefined }))
  .refine((d) => !d.mediaType || !!d.mediaUrl, { path: ["mediaUrl"], message: "content.conferences.form.mediaRequired" });

export async function saveConference(fd: FormData | Record<string, unknown>) {
  return runAction(conferenceSchema, { isPublic: false, ...formToObject(fd) }, async (data) => {
    const user = await requirePermission("content.manage");
    const { id, audioFile: _a, videoFile: _v, videoLink: _l, ...f } = data;
    void _a;
    void _v;
    void _l;
    const payload = {
      ...f,
      speakerBio: f.speakerBio ?? null,
      description: f.description ?? null,
      location: f.location ?? null,
      coverUrl: f.coverUrl ?? null,
      mediaType: f.mediaType ?? null,
      mediaUrl: f.mediaUrl ?? null,
    };
    const c = id ? await db.conference.update({ where: { id }, data: payload }) : await db.conference.create({ data: payload });
    await audit(user.id, id ? "update" : "create", "Conference", c.id, { title: c.title });
    return { id: c.id };
  });
}

export async function deleteConference(id: string) {
  return runAction(zs.id, id, async (confId) => {
    const user = await requirePermission("content.manage");
    const c = await db.conference.delete({ where: { id: confId } });
    await audit(user.id, "delete", "Conference", confId, { title: c.title });
  });
}

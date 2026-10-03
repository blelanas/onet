import { Router, type Request } from "express";
import { z } from "zod";
import { db } from "@api/lib/db";
import { AuthError } from "@api/lib/auth/guards";
import { getCurrentUser } from "@api/lib/auth/session";
import { runAction } from "@api/lib/actions";
import { mutation, param, sendData } from "@api/lib/http";
import { UPLOAD_MAX_BYTES } from "@onet/shared";
import { BodyTooLargeError, readUpload, saveUpload, UploadError, type UploadKind } from "@api/lib/uploads";

export const filesRouter = Router();

/**
 * Parses a multipart body with the web-standard Request/FormData (no extra dependency).
 * The raw body is capped while it streams in (Content-Length is checked up front and chunked
 * bodies are counted), so a huge request can't exhaust memory before the per-file checks run.
 */
export async function readFormData(req: Request, maxBytes = UPLOAD_MAX_BYTES + 1024 * 1024): Promise<FormData> {
  const declared = Number(req.headers["content-length"] ?? 0);
  if (declared > maxBytes) throw new BodyTooLargeError();
  let received = 0;
  const limited = new ReadableStream<Uint8Array>({
    start(controller) {
      req.on("data", (chunk: Buffer) => {
        received += chunk.length;
        if (received > maxBytes) {
          controller.error(new BodyTooLargeError());
          req.destroy();
          return;
        }
        controller.enqueue(new Uint8Array(chunk));
      });
      req.on("end", () => controller.close());
      req.on("error", (e) => controller.error(e));
    },
  });
  const request = new globalThis.Request("http://local/", {
    method: "POST",
    headers: req.headers as Record<string, string>,
    body: limited,
    duplex: "half",
  } as RequestInit);
  try {
    return await request.formData();
  } catch (e) {
    if (received > maxBytes) throw new BodyTooLargeError();
    throw e;
  }
}

// Any authenticated user may upload; the entity referencing the URL enforces its own permission.
filesRouter.post("/upload", async (req, res, next) => {
  try {
    const user = await getCurrentUser();
    if (!user) return sendData(res, { error: "errors.unauthenticated" }, 401);
    const form = await readFormData(req);
    const file = form.get("file");
    const kind = (form.get("kind") as UploadKind) ?? "image";
    if (!(file instanceof File)) return sendData(res, { error: "errors.validation" }, 400);
    sendData(res, await saveUpload(file, kind, user.id));
  } catch (e) {
    if (e instanceof UploadError) return sendData(res, { error: e.message }, 400);
    if (e instanceof BodyTooLargeError) return sendData(res, { error: "errors.uploadSize" }, 413);
    next(e);
  }
});

// Files are served by unguessable id (capability URL) so <img>/<audio> tags work without headers.
filesRouter.get("/files/:id", async (req, res, next) => {
  try {
    const file = await readUpload(String(req.params.id));
    if (!file) return res.status(404).end();
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Length", String(file.data.length));
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", `${file.mimeType.startsWith("image/") || file.mimeType.startsWith("audio/") || file.mimeType.startsWith("video/") || file.mimeType === "application/pdf" ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    res.end(file.data);
  } catch (e) {
    next(e);
  }
});

/** Is this uploaded file URL still used by any record (every column that stores an upload URL, plus settings JSON)? */
async function isFileReferenced(url: string) {
  const eq = { equals: url };
  const counts = await Promise.all([
    db.document.count({ where: { url: eq } }),
    db.user.count({ where: { avatarUrl: eq } }),
    db.member.count({ where: { photoUrl: eq } }),
    db.activity.count({ where: { coverUrl: eq } }),
    db.event.count({ where: { coverUrl: eq } }),
    db.trip.count({ where: { coverUrl: eq } }),
    db.song.count({ where: { OR: [{ audioUrl: eq }, { coverUrl: eq }] } }),
    db.game.count({ where: { OR: [{ imageUrl: eq }, { videoUrl: eq }] } }),
    db.conference.count({ where: { OR: [{ coverUrl: eq }, { mediaUrl: eq }] } }),
    db.resource.count({ where: { url: eq } }),
    db.newsPost.count({ where: { coverUrl: eq } }),
    db.galleryItem.count({ where: { imageUrl: eq } }),
    db.expense.count({ where: { attachmentUrl: eq } }),
    db.setting.count({ where: { value: { contains: url } } }),
  ]);
  return counts.some((n) => n > 0);
}

/**
 * Discards an upload that was never saved (e.g. the document dialog was closed): only the uploader may
 * do it, only for a recent file, and only while nothing references it.
 */
async function discardUpload(id: string) {
  return runAction(z.string().regex(/^[\w-]{8,64}$/), id, async (fileId) => {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED");
    const file = await db.storedFile.findUnique({ where: { id: fileId }, select: { uploadedById: true, createdAt: true } });
    if (!file || file.uploadedById !== user.id) throw new AuthError("NOT_FOUND");
    if (Date.now() - file.createdAt.getTime() > 24 * 3600_000 || (await isFileReferenced(`/api/files/${fileId}`))) throw new AuthError("FORBIDDEN");
    await db.storedFile.delete({ where: { id: fileId } });
  });
}

filesRouter.delete("/files/:id", mutation((req) => discardUpload(param(req, "id"))));

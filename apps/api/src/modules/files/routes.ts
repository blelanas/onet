import { Router, type Request } from "express";
import { getCurrentUser } from "@api/lib/auth/session";
import { sendData } from "@api/lib/http";
import { readUpload, saveUpload, UploadError, type UploadKind } from "@api/lib/uploads";

export const filesRouter = Router();

/** Parses a multipart body with the web-standard Request/FormData (no extra dependency). */
export async function readFormData(req: Request): Promise<FormData> {
  const request = new globalThis.Request("http://local/", {
    method: "POST",
    headers: req.headers as Record<string, string>,
    body: req as unknown as ReadableStream,
    duplex: "half",
  } as RequestInit);
  return request.formData();
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

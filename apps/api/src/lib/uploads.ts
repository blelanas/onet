import { randomBytes } from "crypto";
import { db } from "@api/lib/db";
import { UPLOAD_ALLOWED_MIME, UPLOAD_MAX_BYTES } from "@onet/shared";

export type UploadKind = keyof typeof UPLOAD_ALLOWED_MIME;
const CHUNK = 512 * 1024;

/** Magic-byte sniffing so a renamed executable can't pass as a PDF/image. */
function sniff(buf: Buffer, mime: string): boolean {
  const hex = buf.subarray(0, 12).toString("hex");
  if (mime === "image/jpeg") return hex.startsWith("ffd8ff");
  if (mime === "image/png") return hex.startsWith("89504e47");
  if (mime === "image/gif") return hex.startsWith("47494638");
  if (mime === "image/webp") return hex.startsWith("52494646") && buf.subarray(8, 12).toString() === "WEBP";
  if (mime === "application/pdf") return hex.startsWith("25504446");
  if (mime.includes("openxmlformats")) return hex.startsWith("504b0304");
  if (mime === "application/msword") return hex.startsWith("d0cf11e0");
  return true; // audio/video containers vary; size + mime whitelist still applies
}

export class UploadError extends Error {}
/** Request body above the upload limit (rejected while streaming). */
export class BodyTooLargeError extends Error {}

/** Validates and stores a file in the database; returns its public, unguessable URL. */
export async function saveUpload(file: File, kind: UploadKind, uploadedById: string | null) {
  const allowed = UPLOAD_ALLOWED_MIME[kind];
  if (!allowed || !allowed.includes(file.type)) throw new UploadError("errors.uploadType");
  if (file.size > UPLOAD_MAX_BYTES) throw new UploadError("errors.uploadSize");
  const buf = Buffer.from(await file.arrayBuffer());
  if (!sniff(buf, file.type)) throw new UploadError("errors.uploadType");

  const id = randomBytes(18).toString("base64url");
  const chunks = [];
  for (let i = 0, n = 0; i < buf.length; i += CHUNK, n++) chunks.push({ index: n, data: buf.subarray(i, i + CHUNK) });
  await db.storedFile.create({
    data: { id, name: file.name.slice(0, 200), mimeType: file.type, sizeBytes: file.size, uploadedById, chunks: { create: chunks } },
  });
  return { url: `/api/files/${id}`, mimeType: file.type, sizeBytes: file.size, originalName: file.name.slice(0, 200) };
}

export async function readUpload(id: string) {
  const file = await db.storedFile.findUnique({ where: { id }, include: { chunks: { orderBy: { index: "asc" } } } });
  if (!file) return null;
  return { ...file, data: Buffer.concat(file.chunks.map((c) => Buffer.from(c.data))) };
}

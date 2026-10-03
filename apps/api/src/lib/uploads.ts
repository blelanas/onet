import { randomBytes } from "crypto";
import { db } from "@api/lib/db";
import { UPLOAD_ALLOWED_MIME, UPLOAD_MAX_BYTES } from "@onet/shared";

export type UploadKind = keyof typeof UPLOAD_ALLOWED_MIME;
const CHUNK = 512 * 1024;

/** Magic-byte sniffing so a renamed executable can't pass as a PDF/image/media file. */
export function sniff(buf: Uint8Array, mime: string): boolean {
  const b = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
  const hex = b.subarray(0, 12).toString("hex");
  const ascii = (start: number, end: number) => b.subarray(start, end).toString("latin1");
  switch (mime) {
    case "image/jpeg":
      return hex.startsWith("ffd8ff");
    case "image/png":
      return hex.startsWith("89504e47");
    case "image/gif":
      return hex.startsWith("47494638");
    case "image/webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case "application/pdf":
      return hex.startsWith("25504446");
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return hex.startsWith("504b0304");
    case "application/msword":
      return hex.startsWith("d0cf11e0");
    case "audio/mpeg":
    case "audio/mp3":
      // ID3v2 tag, or an MPEG audio frame sync (11 set bits).
      return ascii(0, 3) === "ID3" || (b.length >= 2 && b[0] === 0xff && (b[1]! & 0xe0) === 0xe0);
    case "audio/ogg":
      return ascii(0, 4) === "OggS";
    case "audio/wav":
    case "audio/x-wav":
    case "audio/wave":
      return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE";
    case "audio/x-m4a":
    case "audio/mp4":
    case "video/mp4":
      // ISO base media file: a box size then "ftyp".
      return ascii(4, 8) === "ftyp";
    case "video/webm":
      return hex.startsWith("1a45dfa3"); // EBML header
    default:
      return false; // a type added to the whitelist needs a signature here
  }
}

export class UploadError extends Error {}
/** Request body above the upload limit (rejected while streaming). */
export class BodyTooLargeError extends Error {}

/** Validates and stores a file in the database; returns its public, unguessable URL. */
export async function saveUpload(file: File, kind: UploadKind, uploadedById: string | null) {
  const allowed = UPLOAD_ALLOWED_MIME[kind];
  if (!allowed || !allowed.includes(file.type)) throw new UploadError("errors.uploadType");
  if (file.size > UPLOAD_MAX_BYTES) throw new UploadError("errors.uploadSize");
  if (file.size === 0) throw new UploadError("errors.uploadType");
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
  const { chunks, ...meta } = file;
  // Buffer.concat accepts Uint8Arrays directly: one copy into the result, no per-chunk Buffer.
  return { ...meta, data: Buffer.concat(chunks.map((c) => c.data)) };
}

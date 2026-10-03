import "server-only";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { UPLOAD_ALLOWED_MIME, UPLOAD_MAX_BYTES } from "@/lib/constants";

export type UploadKind = keyof typeof UPLOAD_ALLOWED_MIME;

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-m4a": "m4a",
  "audio/mp4": "m4a",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

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

export async function saveUpload(file: File, kind: UploadKind) {
  const allowed = UPLOAD_ALLOWED_MIME[kind];
  if (!allowed) throw new UploadError("errors.uploadType");
  if (!allowed.includes(file.type)) throw new UploadError("errors.uploadType");
  if (file.size > UPLOAD_MAX_BYTES) throw new UploadError("errors.uploadSize");
  const buf = Buffer.from(await file.arrayBuffer());
  if (!sniff(buf, file.type)) throw new UploadError("errors.uploadType");

  const now = new Date();
  const rel = path.join("uploads", String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"));
  const dir = path.join(process.cwd(), "public", rel);
  await mkdir(dir, { recursive: true });
  const name = `${randomBytes(12).toString("hex")}.${EXT[file.type] ?? "bin"}`;
  await writeFile(path.join(dir, name), buf);
  return { url: `/${rel.split(path.sep).join("/")}/${name}`, mimeType: file.type, sizeBytes: file.size, originalName: file.name.slice(0, 200) };
}

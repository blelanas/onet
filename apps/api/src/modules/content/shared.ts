import { z } from "zod";
import type { CurrentUser } from "@api/lib/auth/session";

/** True for absolute http(s) URLs. */
export function isHttpUrl(v: string) {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Uploaded file ("/api/files/<id>") or static demo asset ("/demo/…"), never protocol-relative. */
export function isLocalFile(v: string) {
  return /^\/(api\/files|demo)\/[\w\-./]+$/.test(v) && !v.includes("..");
}

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : typeof v === "string" ? v.trim() : v);

/** Optional media URL: uploaded file path or http(s) link. Anything else (javascript:, data:, //host) is rejected. */
export const zMediaUrl = z.preprocess(
  blank,
  z
    .string()
    .max(2000)
    .refine((v) => isLocalFile(v) || isHttpUrl(v), "content.common.invalidUrl")
    .optional(),
);

/** Optional uploaded file path only. */
export const zLocalFile = z.preprocess(blank, z.string().max(500).refine(isLocalFile, "content.common.invalidUrl").optional());

/** Comma separated tags → normalised "a,b,c". */
export function normalizeTags(v?: string | null) {
  if (!v) return null;
  const tags = [...new Set(v.split(/[,،]/).map((t) => t.trim()).filter(Boolean))].slice(0, 20);
  return tags.length ? tags.join(",") : null;
}

export function splitTags(v?: string | null) {
  return v ? v.split(",").map((t) => t.trim()).filter(Boolean) : [];
}

/**
 * Resource audiences the user may see. Staff with content.manage see everything;
 * otherwise ALL plus the audiences matching their roles (kids: ALL + KIDS).
 */
export function allowedAudiences(user: CurrentUser): "all" | string[] {
  if (user.permissions.has("content.manage")) return "all";
  const set = new Set(["ALL"]);
  if (user.roles.includes("parent")) set.add("PARENTS");
  if (user.roles.includes("monitor")) set.add("MONITORS");
  if (user.roles.includes("kid")) set.add("KIDS");
  return [...set];
}

/** Turns a video URL into an embeddable YouTube/Vimeo URL, or null when it isn't one. */
export function videoEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    const v = u.searchParams.get("v");
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(u.pathname.slice(1))}`;
    if (host === "youtube.com" && v) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v)}`;
    if (host === "youtube.com" && u.pathname.startsWith("/embed/")) return `https://www.youtube-nocookie.com${u.pathname}`;
    if (host === "vimeo.com" && /^\/\d+$/.test(u.pathname)) return `https://player.vimeo.com/video${u.pathname}`;
  } catch {
    /* not a URL */
  }
  return null;
}

export function isVideoFile(url: string) {
  return /\.(mp4|webm)(\?.*)?$/i.test(url);
}

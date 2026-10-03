// Client copies of the API's media helpers (apps/api/src/modules/content/shared.ts).

/** Uploaded file ("/api/files/<id>") or static demo asset ("/demo/…"). */
export function isLocalFile(v?: string | null): v is string {
  return !!v && /^\/(api\/files|demo)\/[\w\-./]+$/.test(v) && !v.includes("..");
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

/** Comma separated tags → list. */
export function splitTags(v?: string | null) {
  return v ? v.split(",").map((t) => t.trim()).filter(Boolean) : [];
}

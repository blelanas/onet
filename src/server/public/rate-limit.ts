import "server-only";
import { headers } from "next/headers";

/**
 * Tiny in-memory sliding-window rate limiter for anonymous public forms.
 * Per-process only (fine for a single Node instance); swap for Redis/DB when scaling out.
 */
type Bucket = number[];
const store: Map<string, Bucket> = ((globalThis as unknown as { __onetPublicRL?: Map<string, Bucket> }).__onetPublicRL ??= new Map());

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "unknown";
}

/** Returns true when the call is allowed (and records it), false when the limit is reached. */
export async function hitRateLimit(kind: string, { limit = 3, windowMs = 5 * 60_000 } = {}) {
  const key = `${kind}:${await clientIp()}`;
  const now = Date.now();
  const recent = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    store.set(key, recent);
    return false;
  }
  recent.push(now);
  store.set(key, recent);
  // Opportunistic cleanup so the map cannot grow without bound.
  if (store.size > 5000) for (const [k, v] of store) if (!v.some((t) => now - t < windowMs)) store.delete(k);
  return true;
}

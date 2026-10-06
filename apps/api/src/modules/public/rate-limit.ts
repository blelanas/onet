import { als } from "@api/lib/context";

/**
 * Tiny in-memory sliding-window rate limiter for anonymous public forms.
 * Per-process only (fine for a single Node instance); swap for Redis/DB when scaling out.
 */
type Bucket = number[];
const store = new Map<string, Bucket>();

/**
 * Client IP as resolved by Express (`trust proxy` is configured in app.ts, so a client cannot
 * pick its own bucket by sending an arbitrary X-Forwarded-For header).
 */
export function clientIp() {
  const req = als.getStore()?.req;
  return req?.ip || req?.socket.remoteAddress || "unknown";
}

const MAX_KEYS = 5000;

/** Stores a bucket as the most recently used entry (Map iteration order = least recent first). */
function touch(key: string, bucket: Bucket) {
  store.delete(key);
  store.set(key, bucket);
}

/** Returns true when the call is allowed (and records it), false when the limit is reached. */
export async function hitRateLimit(kind: string, { limit = 3, windowMs = 5 * 60_000 } = {}) {
  const key = `${kind}:${clientIp()}`;
  const now = Date.now();
  const recent = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    touch(key, recent);
    return false;
  }
  recent.push(now);
  touch(key, recent);
  if (store.size > MAX_KEYS) {
    // Drop expired buckets first, then hard-cap the map by evicting the least recently used.
    for (const [k, v] of store) if (!v.some((t) => now - t < windowMs)) store.delete(k);
    for (const k of store.keys()) {
      if (store.size <= MAX_KEYS) break;
      store.delete(k);
    }
  }
  return true;
}

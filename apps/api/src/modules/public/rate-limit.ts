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

/** Returns true when the call is allowed (and records it), false when the limit is reached. */
export async function hitRateLimit(kind: string, { limit = 3, windowMs = 5 * 60_000 } = {}) {
  const key = `${kind}:${clientIp()}`;
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

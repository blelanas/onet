import { AsyncLocalStorage } from "async_hooks";
import type { Request } from "express";

/**
 * Per-request context (replaces Next.js `headers()` / `cookies()` / React `cache()`):
 * holds the request, the resolved user and a memo map so helpers keep simple signatures.
 */
export type RequestContext = {
  req: Request;
  memo: Map<string, unknown>;
};

export const als = new AsyncLocalStorage<RequestContext>();

export function ctx(): RequestContext {
  const c = als.getStore();
  if (!c) throw new Error("No request context");
  return c;
}

export function clientIp(): string | null {
  const c = als.getStore();
  if (!c) return null;
  return (c.req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? c.req.socket.remoteAddress ?? null;
}

/** Memoize an async function per request (like React `cache`). */
export function requestCache<A extends unknown[], R>(key: string, fn: (...args: A) => Promise<R>) {
  return (...args: A): Promise<R> => {
    const store = als.getStore();
    if (!store) return fn(...args);
    const k = `${key}:${JSON.stringify(args, (_k, v) => (v instanceof Set ? [...v] : v))}`;
    if (!store.memo.has(k)) store.memo.set(k, fn(...args));
    return store.memo.get(k) as Promise<R>;
  };
}

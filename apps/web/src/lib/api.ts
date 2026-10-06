import superjson from "superjson";
import type { ActionResult } from "@onet/shared";

export type { ActionResult };

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:4000";
const TOKEN_KEY = "onet_token";
const LOCALE_KEY = "onet_locale";

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t: string | null) => {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

export function currentLocale() {
  try {
    return localStorage.getItem(LOCALE_KEY) ?? document.documentElement.lang ?? "fr";
  } catch {
    return "fr";
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public key: string,
  ) {
    super(key);
  }
}

function headers(json: boolean): HeadersInit {
  const h: Record<string, string> = { "X-Locale": currentLocale() };
  const t = tokenStore.get();
  if (t) h.Authorization = `Bearer ${t}`;
  if (json) h["Content-Type"] = "application/json";
  return h;
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | null | undefined>) {
  const url = new URL(`${API_URL}/api${path}`);
  if (params) for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  return url.toString();
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return superjson.parse<T>(text);
  } catch {
    return JSON.parse(text) as T;
  }
}

/** GET a resource; throws ApiError (401 / 403 / 404 …) so pages can render the right state. */
export async function apiGet<T>(path: string, params?: Record<string, string | number | boolean | null | undefined>): Promise<T> {
  const res = await fetch(buildUrl(path, params), { headers: headers(false) });
  if (!res.ok) {
    const body = await parse<{ error?: string }>(res).catch(() => undefined);
    if (res.status === 401) tokenStore.set(null);
    throw new ApiError(res.status, body?.error ?? "errors.unexpected");
  }
  return parse<T>(res);
}

/** Mutation: always resolves to an ActionResult (network errors included). */
export async function apiSend<T = unknown>(method: "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<ActionResult<T>> {
  try {
    const isForm = body instanceof FormData;
    const res = await fetch(buildUrl(path), {
      method,
      headers: headers(!isForm && body !== undefined),
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
    const result = await parse<ActionResult<T>>(res);
    if (result && typeof result === "object" && "ok" in result) return result;
    return res.ok ? { ok: true, data: result as T } : { ok: false, error: "errors.unexpected" };
  } catch {
    return { ok: false, error: "errors.network" };
  }
}

/**
 * FormData → plain object (same rules as the former server actions: checkbox "on" → true,
 * keys ending with [] → arrays). Files are dropped (uploads go through /upload first).
 */
export function formToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string") continue;
    if (k.endsWith("[]")) {
      const key = k.slice(0, -2);
      const list = (out[key] as unknown[] | undefined) ?? [];
      list.push(v);
      out[key] = list;
    } else out[k] = v === "on" ? true : v;
  }
  return out;
}

/**
 * Builds a function with the exact signature the ported forms expect from a server action:
 * `(fd: FormData) => Promise<ActionResult>`.
 */
export function formAction<T = unknown>(method: "POST" | "PUT" | "PATCH" | "DELETE", path: string | ((values: Record<string, unknown>) => string), extra?: Record<string, unknown>) {
  return (fd: FormData) => {
    const values = { ...formToObject(fd), ...extra };
    return apiSend<T>(method, typeof path === "function" ? path(values) : path, values);
  };
}

/** URL of an uploaded file or a static asset (uploaded files are served by the API). */
export function assetUrl(url?: string | null) {
  if (!url) return undefined;
  return url.startsWith("/api/") ? `${API_URL}${url}` : url;
}

/** Downloads an authenticated file (CSV exports, .ics) through fetch + blob. */
export async function download(path: string, params?: Record<string, string | undefined>) {
  const res = await fetch(buildUrl(path, params), { headers: headers(false) });
  if (!res.ok) throw new ApiError(res.status, "errors.unexpected");
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") ?? "";
  const name = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd)?.[1] ?? path.split("/").pop() ?? "download";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = decodeURIComponent(name);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function uploadFile(file: File, kind: string) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", kind);
  const res = await fetch(buildUrl("/upload"), { method: "POST", headers: headers(false), body: fd });
  const json = await parse<{ url?: string; error?: string; mimeType: string; sizeBytes: number; originalName: string }>(res);
  if (!res.ok || !json?.url) throw new Error(json?.error ?? "errors.unexpected");
  return json as { url: string; mimeType: string; sizeBytes: number; originalName: string };
}

export { LOCALE_KEY };

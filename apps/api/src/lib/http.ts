import type { NextFunction, Request, Response, Router } from "express";
import superjson from "superjson";
import { AuthError } from "@api/lib/auth/guards";
import { ActionError, type ActionResult } from "@api/lib/actions";

const STATUS = { UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404 } as const;

/** Responses are superjson-encoded so Dates (and Sets/Maps) survive the round trip. */
export function sendData(res: Response, data: unknown, status = 200) {
  res.status(status).type("application/json").send(superjson.stringify(data));
}

type Handler<T> = (req: Request, res: Response) => Promise<T>;

/**
 * Read endpoint: the handler returns the payload. AuthError → 401/403/404 with an i18n error key.
 * If the handler already wrote the response (CSV/file download), nothing else is sent.
 */
export function query<T>(handler: Handler<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await handler(req, res);
      if (!res.headersSent) sendData(res, data);
    } catch (e) {
      next(e);
    }
  };
}

/**
 * Mutation endpoint: the handler returns an ActionResult (usually from runAction). The body is
 * always an ActionResult; the HTTP status mirrors it for logs and monitoring.
 */
export function mutation(handler: Handler<ActionResult<unknown>>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await handler(req, res);
      const status = result.ok ? 200 : result.error === "errors.unauthenticated" ? 401 : result.error === "errors.forbidden" ? 403 : result.error === "errors.notFound" ? 404 : 400;
      sendData(res, result, status);
    } catch (e) {
      next(e);
    }
  };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AuthError) {
    const key = err.code === "UNAUTHENTICATED" ? "errors.unauthenticated" : err.code === "NOT_FOUND" ? "errors.notFound" : "errors.forbidden";
    return sendData(res, { ok: false, error: key }, STATUS[err.code]);
  }
  if (err instanceof ActionError) return sendData(res, { ok: false, error: err.message }, 400);
  if (err && typeof err === "object" && "type" in err && (err as { type: string }).type === "entity.too.large") return sendData(res, { ok: false, error: "errors.uploadSize" }, 413);
  console.error("[api] unexpected error", err);
  sendData(res, { ok: false, error: "errors.unexpected" }, 500);
}

/** Query-string helper: first value as string. */
export function qs(req: Request, key: string): string | undefined {
  const v = req.query[key];
  if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : undefined;
  return typeof v === "string" && v !== "" ? v : undefined;
}

/** All query params as the Record shape the ported page loaders expect (searchParams). */
export function searchParams(req: Request): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const k of Object.keys(req.query)) out[k] = qs(req, k);
  return out;
}

export type { Router };

/** CSV download helper. */
export function sendCsv(res: Response, filename: string, csv: string) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

/** Route param as a string (Express 5 types allow string[] for wildcard params). */
export function param(req: Request, key: string): string {
  const v = req.params[key];
  return Array.isArray(v) ? v.join("/") : String(v ?? "");
}

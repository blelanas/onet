import { z } from "zod";
import { AuthError } from "@api/lib/auth/guards";
import { parseFormDate, type ActionResult } from "@onet/shared";

export type { ActionResult };

/** Domain error with an i18n key (common.errors.*) or a plain message, shown in a toast. */
export class ActionError extends Error {}

/**
 * Wraps a server action: validates input with zod, maps auth/domain errors to a serialisable
 * result. Error strings are i18n keys under "common.errors" when they start with "errors.".
 */
export async function runAction<S extends z.ZodType, T>(
  schema: S,
  input: unknown,
  handler: (data: z.infer<S>) => Promise<T>,
): Promise<ActionResult<T>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path.join(".");
      if (!fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { ok: false, error: "errors.validation", fieldErrors };
  }
  try {
    const data = await handler(parsed.data);
    return { ok: true, data };
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, error: e.code === "UNAUTHENTICATED" ? "errors.unauthenticated" : e.code === "NOT_FOUND" ? "errors.notFound" : "errors.forbidden" };
    }
    if (e instanceof ActionError) return { ok: false, error: e.message };
    console.error("[action] unexpected error", e);
    return { ok: false, error: "errors.unexpected" };
  }
}

/**
 * Request body → plain object. The web client already sends JSON (it converts FormData with
 * the same rules), so plain objects pass through; FormData is still accepted for multipart routes.
 */
export function formToObject(fd: FormData | Record<string, unknown>): Record<string, unknown> {
  if (!(fd instanceof FormData)) return fd ?? {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("$ACTION")) continue;
    const val = v;
    if (k.endsWith("[]")) {
      const key = k.slice(0, -2);
      const list = (out[key] as unknown[] | undefined) ?? [];
      list.push(val);
      out[key] = list;
    } else out[k] = val === "on" ? true : val;
  }
  return out;
}

// Reusable zod helpers for form inputs (empty string → undefined/null).
export const zs = {
  optStr: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : typeof v === "string" ? v.trim() : v), z.string().max(5000).optional()),
  reqStr: (max = 200) => z.string().trim().min(1, "errors.required").max(max),
  // datetime-local values (no offset) are Tunisian wall time, not the server's (UTC) time zone.
  optDate: z.preprocess((v) => (v === "" || v == null ? undefined : v instanceof Date ? v : parseFormDate(String(v))), z.date().optional()),
  reqDate: z.preprocess((v) => (v === "" || v == null ? undefined : v instanceof Date ? v : parseFormDate(String(v))), z.date({ error: "errors.required" })),
  optInt: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().optional()),
  int: (min = 0) => z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(min)),
  bool: z.preprocess((v) => v === true || v === "true" || v === "on" || v === "1", z.boolean()),
  money: z.preprocess(
    (v) => (v === "" || v == null ? 0 : Math.round(Number(String(v).replace(",", ".")) * 1000)),
    z.number().int().min(0),
  ),
  id: z.string().min(1),
  optId: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
};

/** Shape returned by every API mutation (kept identical to the former server actions). */
export type ActionResult<T = unknown> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

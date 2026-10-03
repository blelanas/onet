// Local-day helpers (same conventions as the API's modules/attendance/day.ts): days are local
// midnights, weeks start on Monday. Used by the groups, activities, attendance and calendar UIs.

/** Local midnight of a Date, or of a "YYYY-MM-DD" string (parsed as a local date, not UTC). */
export function normalizeDay(input?: Date | string | null): Date {
  if (typeof input === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(input);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(input);
    if (!Number.isNaN(d.getTime())) return normalizeDay(d);
    return normalizeDay(new Date());
  }
  const d = input ? new Date(input) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Strict parse: returns null for anything that is not a valid "YYYY-MM-DD". */
export function parseDayParam(v: unknown): Date | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = normalizeDay(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dayKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDaysLocal(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Monday-based week start. */
export function startOfWeek(d: Date) {
  const x = normalizeDay(d);
  const diff = (x.getDay() + 6) % 7;
  return addDaysLocal(x, -diff);
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

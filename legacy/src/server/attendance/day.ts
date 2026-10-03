// Day helpers shared by attendance & calendar. Attendance rows are keyed by the day at
// 00:00 *local server time* (same convention as the seed), so every write and read must go
// through `normalizeDay` for the unique (memberId, date, contextKey) key to match.

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

/** Most recent date (≤ `from`) falling on weekday `dow` (0=Sunday). */
export function lastWeekday(dow: number, from = new Date()) {
  const d = normalizeDay(from);
  const diff = (d.getDay() - dow + 7) % 7;
  return addDaysLocal(d, -diff);
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Context keys used by Attendance.contextKey. */
export type AttendanceContext = { kind: "group" | "activity"; id: string };
export function parseContextKey(v: unknown): AttendanceContext | null {
  if (typeof v !== "string") return null;
  const m = /^(group|activity):([A-Za-z0-9_-]{1,64})$/.exec(v);
  return m ? { kind: m[1] as "group" | "activity", id: m[2] } : null;
}
export const contextKeyOf = (c: AttendanceContext) => `${c.kind}:${c.id}`;

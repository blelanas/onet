// Period helpers shared by finance pages, CSV exports and reports (pure functions).
export const PERIOD_KEYS = ["all", "month", "quarter", "year", "custom"] as const;
export type PeriodKey = (typeof PERIOD_KEYS)[number];
export type Period = { key: PeriodKey; from?: Date; to?: Date };
type SP = Record<string, string | string[] | undefined> | URLSearchParams;

function get(sp: SP, k: string) {
  if (sp instanceof URLSearchParams) return sp.get(k) || undefined;
  const v = sp[k];
  return typeof v === "string" && v ? v : undefined;
}

// Custom ranges outside these years are ignored (e.g. a typo'd "0001-01-01" would otherwise
// span ~24,000 monthly buckets in reports).
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

function parseDay(v?: string, endOfDay = false) {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00`);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < MIN_YEAR || d.getFullYear() > MAX_YEAR) return undefined;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d;
}

/** Resolves ?period=month|quarter|year|custom (&from=&to=) into a date range. */
export function resolvePeriod(sp: SP, fallback: PeriodKey = "all", now = new Date()): Period {
  const raw = get(sp, "period");
  const key = (PERIOD_KEYS as readonly string[]).includes(raw ?? "") ? (raw as PeriodKey) : fallback;
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case "month":
      return { key, from: new Date(y, m, 1), to: new Date(y, m + 1, 0, 23, 59, 59, 999) };
    case "quarter": {
      const q = Math.floor(m / 3) * 3;
      return { key, from: new Date(y, q, 1), to: new Date(y, q + 3, 0, 23, 59, 59, 999) };
    }
    case "year":
      return { key, from: new Date(y, 0, 1), to: new Date(y, 11, 31, 23, 59, 59, 999) };
    case "custom": {
      let from = parseDay(get(sp, "from"));
      let to = parseDay(get(sp, "to"), true);
      if (from && to && from > to) [from, to] = [parseDay(get(sp, "to")), parseDay(get(sp, "from"), true)];
      return { key, from, to };
    }
    default:
      return { key: "all" };
  }
}

/** Prisma date filter for a period (undefined when unbounded). */
export function periodWhere(p: Period) {
  if (!p.from && !p.to) return undefined;
  return { ...(p.from ? { gte: p.from } : {}), ...(p.to ? { lte: p.to } : {}) };
}

/** Keeps the given params (period + filters) for CSV export links. */
export function keepParams(sp: SP, keys: string[]) {
  const out = new URLSearchParams();
  for (const k of keys) {
    const v = get(sp, k);
    if (v) out.set(k, v);
  }
  return out.toString();
}

export function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * "2026-03" month keys between two dates (inclusive). Not capped, so the series always covers
 * the same range as the totals; callers bound the range (custom periods are validated above).
 */
export function monthKeys(from: Date, to: Date) {
  const keys: string[] = [];
  const d = new Date(from.getFullYear(), from.getMonth(), 1);
  while (d <= to) {
    keys.push(monthKey(d));
    d.setMonth(d.getMonth() + 1);
  }
  return keys;
}

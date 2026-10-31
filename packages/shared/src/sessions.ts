import { EVENT_FREQUENCIES, type EventFrequency } from "./constants";
import { APP_TIME_ZONE, zonedDayKey } from "./dates";

/** Sessions of one event are capped (a daily event over several years would otherwise list thousands of days). */
export const MAX_SESSIONS = 400;

export function isEventFrequency(v: unknown): v is EventFrequency {
  return typeof v === "string" && (EVENT_FREQUENCIES as readonly string[]).includes(v);
}

/** Frequency proposed for a new edition of a programme: a club meets every week, a festival every day. */
export function defaultFrequencyForKind(kind: string | null | undefined): EventFrequency {
  return kind === "CLUB" ? "WEEKLY" : kind === "FESTIVAL" ? "DAILY" : "ONCE";
}

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (y: number, m: number, d: number) => `${String(y).padStart(4, "0")}-${pad(m)}-${pad(d)}`;
/** Days in a 1-based month. */
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const parse = (key: string) => key.split("-").map(Number) as [number, number, number];

/**
 * The sessions of an event: the local days (in APP_TIME_ZONE, "YYYY-MM-DD") on which it meets, from its
 * first to its last day, in order:
 *  - ONCE: the start day; an event spanning several days meets every one of them (like DAILY);
 *  - DAILY: every day from start to end;
 *  - WEEKLY: the start day, then every 7 days until the end;
 *  - MONTHLY: the start day's day-of-month every month until the end (the 31st → the last day of shorter months).
 * At most `max` sessions. An unknown frequency counts as ONCE; an end before the start as the start day.
 */
export function eventSessions(e: { startAt: Date | string; endAt: Date | string; frequency?: string | null }, timeZone = APP_TIME_ZONE, max = MAX_SESSIONS): string[] {
  const first = zonedDayKey(e.startAt, timeZone);
  const last = zonedDayKey(e.endAt, timeZone);
  if (first.startsWith("NaN") || last.startsWith("NaN")) return [];
  let freq: EventFrequency = isEventFrequency(e.frequency) ? e.frequency : "ONCE";
  if (last <= first) return [first];
  if (freq === "ONCE") freq = "DAILY";
  const [y0, m0, d0] = parse(first);
  const out: string[] = [];
  if (freq === "MONTHLY") {
    for (let k = 0; out.length < max; k++) {
      const y = y0 + Math.floor((m0 - 1 + k) / 12);
      const m = ((m0 - 1 + k) % 12) + 1;
      const key = keyOf(y, m, Math.min(d0, daysIn(y, m)));
      if (key > last) break;
      out.push(key);
    }
    return out;
  }
  const step = freq === "WEEKLY" ? 7 : 1;
  // Calendar arithmetic on UTC dates: no time-zone or DST surprises.
  for (let t = Date.UTC(y0, m0 - 1, d0); out.length < max; t += step * 86400_000) {
    const d = new Date(t);
    const key = keyOf(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    if (key > last) break;
    out.push(key);
  }
  return out;
}

/** Session shown first: today when it is one, else the latest past session, else the first one (null when none). */
export function defaultSession(sessions: string[], today: string): string | null {
  if (!sessions.length) return null;
  if (sessions.includes(today)) return today;
  const past = sessions.filter((s) => s < today);
  return past.length ? past[past.length - 1] : sessions[0];
}

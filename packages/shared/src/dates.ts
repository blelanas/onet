const LOCALE_MAP: Record<string, string> = { fr: "fr-TN", ar: "ar-TN-u-nu-latn", en: "en-GB" };

export function intlLocale(locale: string) {
  return LOCALE_MAP[locale] ?? "fr-TN";
}

export function formatDate(d: Date | string | null | undefined, locale = "fr", style: "short" | "medium" | "long" = "medium") {
  if (!d) return "—";
  const opts: Intl.DateTimeFormatOptions =
    style === "short"
      ? { day: "2-digit", month: "2-digit", year: "numeric" }
      : style === "long"
        ? { weekday: "long", day: "numeric", month: "long", year: "numeric" }
        : { day: "numeric", month: "short", year: "numeric" };
  return new Intl.DateTimeFormat(intlLocale(locale), opts).format(new Date(d));
}

export function formatTime(d: Date | string, locale = "fr") {
  return new Intl.DateTimeFormat(intlLocale(locale), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(d));
}

export function formatDateTime(d: Date | string | null | undefined, locale = "fr") {
  if (!d) return "—";
  return `${formatDate(d, locale)} · ${formatTime(d, locale)}`;
}

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** "2026-10-03" for <input type="date"> */
export function toDateInput(d?: Date | string | null) {
  if (!d) return "";
  const x = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

/** The association's time zone: wall-clock times typed in forms are Tunisian time (UTC+1, no DST). */
export const APP_TIME_ZONE = "Africa/Tunis";

const tzFormatters = new Map<string, Intl.DateTimeFormat>();
/** Wall-clock parts of an instant in `timeZone`. */
function zonedParts(d: Date, timeZone: string) {
  let f = tzFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    tzFormatters.set(timeZone, f);
  }
  const p: Record<string, number> = {};
  for (const part of f.formatToParts(d)) if (part.type !== "literal") p[part.type] = Number(part.value);
  return { year: p.year!, month: p.month!, day: p.day!, hour: p.hour! % 24, minute: p.minute!, second: p.second! };
}

/** Offset (ms) of `timeZone` from UTC at instant `d`. */
function tzOffsetMs(d: Date, timeZone: string) {
  const p = zonedParts(d, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - (d.getTime() - d.getUTCMilliseconds());
}

/** The instant at which the wall clock in `timeZone` reads the given date/time (month is 1-based). */
export function zonedTimeToDate(year: number, month: number, day: number, hour = 0, minute = 0, second = 0, ms = 0, timeZone = APP_TIME_ZONE) {
  const wall = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  const off = tzOffsetMs(new Date(wall), timeZone);
  let t = wall - off;
  const off2 = tzOffsetMs(new Date(t), timeZone);
  if (off2 !== off) t = wall - off2;
  return new Date(t);
}

/** Is (year, 1-based month, day) a real calendar date (e.g. rejects 2024-02-30, 2025-02-29)? */
export function isValidCalendarDate(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Parses a form date value. "YYYY-MM-DDTHH:mm[:ss]" without an offset (what
 * <input type="datetime-local"> sends) is read as wall time in APP_TIME_ZONE, whatever the
 * server's own time zone; anything else (date-only, ISO with offset/Z) goes through `Date`.
 */
export function parseFormDate(v: string, timeZone = APP_TIME_ZONE): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(v.trim());
  if (!m) {
    // `Date` rolls invalid days over (2024-02-31 → March 2): reject them instead.
    const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
    if (dm && !isValidCalendarDate(Number(dm[1]), Number(dm[2]), Number(dm[3]))) return new Date(NaN);
    return new Date(v);
  }
  const [, y, mo, d, h, mi, s, ms] = m;
  if (!isValidCalendarDate(Number(y), Number(mo), Number(d)) || Number(h) > 23 || Number(mi) > 59 || Number(s ?? 0) > 59) return new Date(NaN);
  return zonedTimeToDate(Number(y), Number(mo), Number(d), Number(h), Number(mi), Number(s ?? 0), Number((ms ?? "0").padEnd(3, "0")), timeZone);
}

/** "2026-10-03T14:00" (or "…T14:00:15" when seconds are set; wall time in APP_TIME_ZONE) for <input type="datetime-local">; inverse of `parseFormDate`. */
export function toDateTimeInput(d?: Date | string | null, timeZone = APP_TIME_ZONE) {
  if (!d) return "";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  const p = zonedParts(x, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}${p.second ? `:${pad(p.second)}` : ""}`;
}

export function relativeTime(d: Date | string, locale = "fr") {
  const diff = (new Date(d).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), "month");
  return rtf.format(Math.round(diff / (86400 * 365)), "year");
}

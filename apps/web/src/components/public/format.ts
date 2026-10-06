import { intlLocale } from "@onet/shared";

export function dayMonth(d: Date, locale: string) {
  const l = intlLocale(locale);
  return {
    day: new Intl.DateTimeFormat(l, { day: "numeric" }).format(d),
    month: new Intl.DateTimeFormat(l, { month: "short" }).format(d).replace(".", ""),
    weekday: new Intl.DateTimeFormat(l, { weekday: "long" }).format(d),
  };
}

export function dateRange(a: Date, b: Date, locale: string) {
  const l = intlLocale(locale);
  const sameDay = a.toDateString() === b.toDateString();
  const f = new Intl.DateTimeFormat(l, { day: "numeric", month: "short", year: "numeric" });
  if (sameDay) return f.format(a);
  try {
    return f.formatRange(a, b);
  } catch {
    return `${f.format(a)} – ${f.format(b)}`;
  }
}

export function longDate(d: Date, locale: string) {
  return new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
}

export function timeRange(a: Date, b: Date, locale: string) {
  return `${clock(a, locale)} – ${clock(b, locale)}`;
}

export function daysBetween(a: Date, b: Date) {
  const x = new Date(a);
  x.setHours(0, 0, 0, 0);
  const y = new Date(b);
  y.setHours(0, 0, 0, 0);
  return Math.round((y.getTime() - x.getTime()) / 86400_000) + 1;
}

/** Splits free text into paragraphs (blank-line separated). */
export function paragraphs(text?: string | null) {
  return (text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function clock(d: Date, locale: string) {
  return new Intl.DateTimeFormat(intlLocale(locale), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
}

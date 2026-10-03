import { formatDate, intlLocale } from "@onet/shared";

/** 24-hour clock time ("09:30") — fr-TN otherwise renders 12-hour AM/PM. */
export function hm(d: Date | string, locale: string) {
  return new Intl.DateTimeFormat(intlLocale(locale), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(d));
}

/** "12 oct. 2026 · 09:30" with a 24-hour clock. */
export function dateTime(d: Date | string | null | undefined, locale: string) {
  if (!d) return "—";
  return `${formatDate(d, locale)} · ${hm(d, locale)}`;
}

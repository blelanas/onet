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

/** "2026-10-03T14:00" for <input type="datetime-local"> */
export function toDateTimeInput(d?: Date | string | null) {
  if (!d) return "";
  const x = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${toDateInput(x)}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
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

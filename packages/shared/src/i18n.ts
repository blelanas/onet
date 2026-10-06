export const LOCALES = ["fr", "ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "NEXT_LOCALE";
export const RTL_LOCALES: Locale[] = ["ar"];

export const LOCALE_LABELS: Record<Locale, { native: string; flag: string }> = {
  fr: { native: "Français", flag: "FR" },
  ar: { native: "العربية", flag: "ع" },
  en: { native: "English", flag: "EN" },
};

/**
 * Message namespaces — one JSON file per namespace per locale in /messages/<locale>/<ns>.json.
 * Add a namespace here when you create a new module.
 */
export const NAMESPACES = [
  "common",
  "nav",
  "auth",
  "public",
  "dashboard",
  "people",
  "groups",
  "activities",
  "attendance",
  "calendar",
  "events",
  "trips",
  "content",
  "finance",
  "communication",
  "documents",
  "reports",
  "settings",
  "search",
] as const;

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

export function dirFor(locale: string) {
  return RTL_LOCALES.includes(locale as Locale) ? "rtl" : "ltr";
}

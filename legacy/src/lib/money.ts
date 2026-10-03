// Amounts are stored as integer millimes (1 TND = 1000 millimes).
export const CURRENCY = "TND";

export function toMillimes(tnd: number | string): number {
  const n = typeof tnd === "string" ? Number(tnd.replace(",", ".")) : tnd;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 1000);
}

export function fromMillimes(m: number): number {
  return m / 1000;
}

const LOCALE_MAP: Record<string, string> = { fr: "fr-TN", ar: "ar-u-nu-latn", en: "en-GB" };

export function formatMoney(millimes: number, locale = "fr", opts: { compact?: boolean } = {}) {
  const value = millimes / 1000;
  return new Intl.NumberFormat(LOCALE_MAP[locale] ?? "fr-TN", {
    style: "currency",
    currency: CURRENCY,
    notation: opts.compact ? "compact" : "standard",
    minimumFractionDigits: opts.compact ? 0 : value % 1 === 0 ? 0 : 3,
    maximumFractionDigits: opts.compact ? 1 : 3,
  }).format(value);
}

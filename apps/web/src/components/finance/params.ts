/** URL helpers shared by the finance pages (mirror of the API's period/keepParams helpers). */
export const INVOICE_TABS = ["all", "PENDING", "PARTIALLY_PAID", "OVERDUE", "PAID", "CANCELLED", "DRAFT"] as const;

type SP = Record<string, string | string[] | undefined>;

/** Keeps the given params (period + filters) for CSV exports and tab links. */
export function keepParams(sp: SP, keys: string[]) {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = sp[k];
    if (typeof v === "string" && v) out[k] = v;
  }
  return out;
}

export function toQs(params: Record<string, string>) {
  const s = new URLSearchParams(params).toString();
  return s ? `?${s}` : "";
}

import { cn } from "@/lib/utils";

/** Titled card wrapping a chart or a small table in report pages. */
export function ChartCard({ title, hint, action, children, className }: { title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("card min-w-0 p-4 sm:p-5", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-ink">{title}</h2>
          {hint && <p className="text-xs text-muted">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function RateBadge({ rate }: { rate: number | null }) {
  if (rate == null) return <span className="text-muted">—</span>;
  const tone = rate >= 85 ? "bg-leaf-soft text-emerald-700" : rate >= 65 ? "bg-sun-soft text-amber-700" : "bg-red-50 text-red-700";
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-extrabold tabular-nums", tone)}>{rate}%</span>;
}

export function monthLabel(d: Date, locale: string) {
  const map: Record<string, string> = { fr: "fr-TN", ar: "ar-TN-u-nu-latn", en: "en-GB" };
  return new Intl.DateTimeFormat(map[locale] ?? "fr-TN", { month: "short" }).format(d);
}

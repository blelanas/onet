import Link from "next/link";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCENTS = {
  brand: { bg: "bg-brand-50", fg: "text-brand-600", blob: "#E30613" },
  sun: { bg: "bg-sun-soft", fg: "text-amber-600", blob: "#FFB400" },
  sky: { bg: "bg-sky-soft", fg: "text-sky-600", blob: "#1E9BD7" },
  leaf: { bg: "bg-leaf-soft", fg: "text-emerald-600", blob: "#2BB673" },
  grape: { bg: "bg-grape-soft", fg: "text-violet-600", blob: "#7C4DFF" },
  coral: { bg: "bg-coral-soft", fg: "text-orange-600", blob: "#FF6B4A" },
  teal: { bg: "bg-teal-soft", fg: "text-teal-600", blob: "#00A3A3" },
} as const;
export type Accent = keyof typeof ACCENTS;

export function KpiCard({
  label,
  value,
  icon,
  accent = "brand",
  hint,
  trend,
  href,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  accent?: Accent;
  hint?: React.ReactNode;
  trend?: number;
  href?: string;
  className?: string;
}) {
  const a = ACCENTS[accent];
  const body = (
    <div className={cn("card group relative h-full overflow-hidden p-4 sm:p-5", href && "card-hover", className)}>
      <svg className="pointer-events-none absolute -end-6 -top-6 size-24 opacity-[0.09] transition-transform duration-500 group-hover:scale-110" viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="50" fill={a.blob} />
      </svg>
      <div className="flex items-start justify-between gap-2">
        <div className={cn("grid size-10 place-items-center rounded-2xl sm:size-11", a.bg, a.fg)}>{icon}</div>
        {href && <ArrowUpRight className="rtl-flip size-4 text-muted opacity-0 transition group-hover:opacity-100" aria-hidden />}
      </div>
      <div className="mt-3 font-display text-2xl leading-none font-extrabold text-ink tabular-nums sm:text-3xl">{value}</div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-xs font-bold text-muted sm:text-sm">{label}</span>
        {typeof trend === "number" && (
          <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 text-[11px] font-bold", trend >= 0 ? "bg-leaf-soft text-emerald-700" : "bg-red-50 text-red-600")}>
            {trend >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full rounded-2xl">
      {body}
    </Link>
  ) : (
    body
  );
}

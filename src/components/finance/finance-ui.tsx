import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Banknote, CalendarDays, CreditCard, FileCheck2, Landmark, MapPinned, Shapes, Sparkles } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Badge, type Tone } from "@/components/ui/badge";

/** Money with tabular figures. Negative values get a minus and a red tint when `signed`. */
export function Amount({ value, className, signed, compact }: { value: number; className?: string; signed?: boolean; compact?: boolean }) {
  const locale = useLocale();
  return (
    <span className={cn("tabular-nums whitespace-nowrap", signed && value < 0 && "text-red-600", signed && value > 0 && "text-emerald-700", className)}>
      {formatMoney(value, locale, { compact })}
    </span>
  );
}

export const METHOD_STYLE: Record<string, { tone: Tone; color: string; icon: typeof Banknote }> = {
  CASH: { tone: "success", color: "#1E9460", icon: Banknote },
  BANK_TRANSFER: { tone: "info", color: "#1683C0", icon: Landmark },
  ONLINE: { tone: "violet", color: "#7C4DFF", icon: CreditCard },
  CHECK: { tone: "warning", color: "#D98B00", icon: FileCheck2 },
  OTHER: { tone: "neutral", color: "#7a7390", icon: Shapes },
};

export function MethodBadge({ method }: { method: string }) {
  const tc = useTranslations("common.enums.paymentMethod");
  const s = METHOD_STYLE[method] ?? METHOD_STYLE.OTHER;
  const Icon = s.icon;
  return (
    <Badge tone={s.tone}>
      <Icon className="size-3.5" aria-hidden />
      {tc.has(method) ? tc(method) : method}
    </Badge>
  );
}

export const EXPENSE_COLORS: Record<string, string> = {
  TRANSPORT: "#1683C0",
  FOOD: "#FF6B4A",
  MATERIALS: "#7C4DFF",
  ACCOMMODATION: "#00A3A3",
  RENT: "#E30613",
  UTILITIES: "#D98B00",
  EQUIPMENT: "#1E9460",
  COMMUNICATION: "#E8457C",
  OTHER: "#7a7390",
};

/** Small chip linking an invoice/expense to its event, trip or activity. */
export function LinkChip({ event, trip, activity }: { event?: { id: string; title: string } | null; trip?: { id: string; title: string } | null; activity?: { id: string; title: string } | null }) {
  const item = event ? { href: `/dashboard/events/${event.id}`, title: event.title, icon: CalendarDays, cls: "bg-sky-soft text-sky-700" } : trip ? { href: `/dashboard/trips/${trip.id}`, title: trip.title, icon: MapPinned, cls: "bg-leaf-soft text-emerald-700" } : activity ? { href: `/dashboard/activities/${activity.id}`, title: activity.title, icon: Sparkles, cls: "bg-grape-soft text-violet-700" } : null;
  if (!item) return null;
  const Icon = item.icon;
  return (
    <Link href={item.href} className={cn("relative z-10 inline-flex max-w-full items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold hover:brightness-95", item.cls)}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{item.title}</span>
    </Link>
  );
}

/** Colorful billed / collected / outstanding strip with a collection progress bar. */
export function TotalsStrip({ billed, collected, outstanding }: { billed: number; collected: number; outstanding: number }) {
  const t = useTranslations("finance.totals");
  const rate = billed ? Math.round((collected / billed) * 100) : 0;
  const cells = [
    { label: t("billed"), value: billed, cls: "from-sky-soft to-white text-sky-700", dot: "bg-sky" },
    { label: t("collected"), value: collected, cls: "from-leaf-soft to-white text-emerald-700", dot: "bg-leaf" },
    { label: t("outstanding"), value: outstanding, cls: "from-sun-soft to-white text-amber-700", dot: "bg-sun" },
  ];
  return (
    <div className="card mb-5 overflow-hidden">
      <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0 rtl:sm:divide-x-reverse">
        {cells.map((c) => (
          <div key={c.label} className={cn("flex items-center justify-between gap-3 bg-gradient-to-br px-5 py-4 sm:block", c.cls)}>
            <p className="flex items-center gap-2 text-xs font-extrabold tracking-wide uppercase">
              <span className={cn("size-2 rounded-full", c.dot)} aria-hidden />
              {c.label}
            </p>
            <Amount value={c.value} className="font-display text-xl font-extrabold text-ink sm:mt-1 sm:block sm:text-2xl" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 border-t border-line px-5 py-2.5">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-gradient-to-r from-leaf to-teal" style={{ width: `${Math.min(100, rate)}%` }} />
        </div>
        <span className="text-xs font-bold text-ink-2 tabular-nums">{t("rate", { rate })}</span>
        <span className="hidden text-xs text-muted lg:inline">· {t("excluded")}</span>
      </div>
    </div>
  );
}

/** Horizontal ranked bars with formatted amounts (RTL-safe, no chart lib). */
export function AmountBars({ items, total }: { items: { key: string; label: string; amount: number; color: string; hint?: string }[]; total?: number }) {
  const max = Math.max(1, ...items.map((i) => i.amount));
  const sum = total ?? items.reduce((s, i) => s + i.amount, 0);
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 font-bold text-ink-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: i.color }} aria-hidden />
              <span className="truncate">{i.label}</span>
              {i.hint && <span className="shrink-0 text-xs font-semibold text-muted">{i.hint}</span>}
            </span>
            <span className="shrink-0 font-bold text-ink">
              <Amount value={i.amount} />
              <span className="ms-1.5 text-xs font-semibold text-muted tabular-nums">{sum ? Math.round((i.amount / sum) * 100) : 0}%</span>
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(i.amount / max) * 100}%`, background: i.color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

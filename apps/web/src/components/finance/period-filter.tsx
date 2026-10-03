import { useTranslations } from "use-intl";
import { usePathname, useRouter, useSearchParams } from "@/lib/router";
import { useState, useTransition } from "react";
import { CalendarRange, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputClasses } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const KEYS = ["all", "month", "quarter", "year", "custom"] as const;

/** URL-bound period selector: segmented chips + custom date range. */
export function PeriodFilter({ defaultKey = "all", className }: { defaultKey?: (typeof KEYS)[number]; className?: string }) {
  const t = useTranslations("finance.period");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const current = params.get("period") ?? defaultKey;
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");

  const go = (patch: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page");
    const qs = sp.toString();
    start(() => router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false }));
  };

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center", className)}>
      <div className="scrollbar-none -mx-1 flex items-center gap-1 overflow-x-auto px-1" role="radiogroup" aria-label={t("label")}>
        <span className="me-1 grid size-8 shrink-0 place-items-center rounded-xl bg-grape-soft text-violet-700" aria-hidden>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <CalendarRange className="size-4" />}
        </span>
        <div className="flex shrink-0 rounded-xl border border-line bg-surface p-0.5">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={current === k}
              onClick={() => go({ period: k === defaultKey ? null : k, ...(k !== "custom" ? { from: null, to: null } : {}) })}
              className={cn("rounded-[10px] px-3 py-1.5 text-sm font-bold whitespace-nowrap transition", current === k ? "bg-ink text-white shadow-sm" : "text-ink-2 hover:bg-surface-2")}
            >
              {t(k)}
            </button>
          ))}
        </div>
      </div>
      {current === "custom" && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            go({ period: "custom", from: from || null, to: to || null });
          }}
        >
          <label className="flex items-center gap-1.5 text-sm font-bold text-ink-2">
            {t("from")}
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={cn(inputClasses, "w-auto py-1.5")} />
          </label>
          <label className="flex items-center gap-1.5 text-sm font-bold text-ink-2">
            {t("to")}
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={cn(inputClasses, "w-auto py-1.5")} />
          </label>
          <Button type="submit" size="sm" variant="secondary">
            {t("apply")}
          </Button>
        </form>
      )}
    </div>
  );
}

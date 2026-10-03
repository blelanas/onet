import { useTranslations } from "use-intl";
import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "@/lib/router";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { inputClasses } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Opt = { key: string; kind: "group" | "activity"; name: string };

/** Context (group/activity) + date picker bound to the URL (?ctx=&date=). */
export function ContextBar({ options, ctx, date, prevDate, nextDate, allowAll }: { options: Opt[]; ctx: string; date?: string; prevDate?: string; nextDate?: string; allowAll?: boolean }) {
  const t = useTranslations("attendance");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const go = (patch: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    start(() => router.push(`${pathname}?${sp.toString()}`, { scroll: false }));
  };
  const groups = options.filter((o) => o.kind === "group");
  const acts = options.filter((o) => o.kind === "activity");

  return (
    <div className="card mb-5 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
      <label className="sr-only" htmlFor="ctx-select">
        {t("context")}
      </label>
      <select id="ctx-select" value={ctx} onChange={(e) => go({ ctx: e.target.value || null, date: null })} className={cn(inputClasses, "h-12 cursor-pointer text-base font-bold sm:max-w-sm")}>
        {allowAll && <option value="">{t("history.allContexts")}</option>}
        {groups.length > 0 && (
          <optgroup label={t("groups")}>
            {groups.map((o) => (
              <option key={o.key} value={o.key}>
                {o.name}
              </option>
            ))}
          </optgroup>
        )}
        {acts.length > 0 && (
          <optgroup label={t("activities")}>
            {acts.map((o) => (
              <option key={o.key} value={o.key}>
                {o.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {date !== undefined && (
        <div className="flex items-center gap-2">
          <button type="button" disabled={!prevDate} onClick={() => go({ date: prevDate ?? null })} className="grid size-12 shrink-0 place-items-center rounded-xl border border-line text-ink-2 hover:bg-surface-2 disabled:opacity-40" aria-label={t("prevSession")}>
            <ChevronLeft className="rtl-flip size-5" />
          </button>
          <div className="relative flex-1">
            <CalendarDays className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input type="date" value={date} onChange={(e) => e.target.value && go({ date: e.target.value })} aria-label={t("date")} className={cn(inputClasses, "h-12 ps-10 font-bold")} />
          </div>
          <button type="button" disabled={!nextDate} onClick={() => go({ date: nextDate ?? null })} className="grid size-12 shrink-0 place-items-center rounded-xl border border-line text-ink-2 hover:bg-surface-2 disabled:opacity-40" aria-label={t("nextSession")}>
            <ChevronRight className="rtl-flip size-5" />
          </button>
        </div>
      )}
      {pending && <Loader2 className="size-5 animate-spin text-brand-600 sm:ms-auto" />}
    </div>
  );
}

import { useLocale, useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { Check, Clock } from "lucide-react";
import { addDays, intlLocale, startOfDay } from "@onet/shared";
import { cn } from "@/lib/utils";
import type { AgendaItem } from "@api/modules/dashboard/common";
import { startOfWeek } from "./levels";
import { hhmm } from "./widgets";

/** Monday→Sunday columns (7-col grid on large screens). When scrolling horizontally, past days move to the end so today comes first. */
export function WeekSchedule({ sessions, empty, bleed = "-mx-5 px-5", scrollOnly }: { sessions: AgendaItem[]; empty: string; bleed?: string; scrollOnly?: boolean }) {
  const t = useTranslations("dashboard.kid");
  const locale = useLocale();
  if (!sessions.length) return <p className="rounded-2xl bg-surface-2/60 px-4 py-6 text-center text-sm text-muted">{empty}</p>;
  const weekStart = startOfWeek();
  const today = startOfDay();
  const now = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayName = (date: Date) => new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short" }).format(date);
  return (
    <ol className={cn("scrollbar-none flex gap-3 overflow-x-auto pb-1", !scrollOnly && "lg:mx-0 lg:grid lg:grid-cols-7 lg:px-0", bleed)}>
      {days.map((day) => {
        const items = sessions.filter((s) => startOfDay(s.at).getTime() === day.getTime());
        const isToday = day.getTime() === today.getTime();
        return (
          <li key={day.toISOString()} className={cn("w-36 shrink-0 rounded-2xl p-2.5", !scrollOnly && "lg:w-auto", isToday ? "bg-brand-50 ring-2 ring-brand-200" : "bg-surface-2/60", day < today && (scrollOnly ? "order-last opacity-60" : "opacity-60 max-lg:order-last"))}>
            <p className={cn("mb-2 text-center text-xs font-extrabold uppercase", isToday ? "text-brand-700" : "text-muted")}>
              {dayName(day)} <span className="font-display text-base">{day.getDate()}</span>
            </p>
            <ul className="space-y-1.5">
              {items.map((s) => (
                <li key={s.id}>
                  <Link href={s.href} className="block rounded-xl p-2 text-white transition hover:brightness-105" style={{ background: s.color }}>
                    <span className="flex items-center justify-between gap-1 text-[11px] font-bold text-white/90">
                      <span className="flex items-center gap-1" dir="ltr">
                        <Clock className="size-3" /> {hhmm(s.at, locale)}
                      </span>
                      {s.at < now && <Check className="size-3.5" aria-label={t("done")} />}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-tight font-bold">{s.title}</span>
                  </Link>
                </li>
              ))}
              {!items.length && (
                <li className="py-3 text-center text-lg text-muted/50" aria-hidden>
                  ·
                </li>
              )}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

import { useLocale, useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { BookOpen, Bus, CalendarHeart, MapPin, PartyPopper, Shapes, Sparkles, type LucideIcon } from "lucide-react";
import { intlLocale } from "@onet/shared";
import { cn } from "@/lib/utils";
import { addDaysLocal, dayKey, normalizeDay, sameDay } from "@/components/attendance/day";
import type { CalItem, CalKind } from "@api/modules/calendar/queries";

/** 24h "HH:mm" (the format used in Tunisia whatever the UI language). */
function formatTime(d: Date, ...rest: unknown[]) {
  void rest;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export const KIND_ICONS: Record<CalKind, LucideIcon> = { activity: Sparkles, group: Shapes, event: PartyPopper, trip: Bus, conference: BookOpen, entry: CalendarHeart };

type DayItem = CalItem & { isStart: boolean; isEnd: boolean };

/** Spread items over the days they cover (multi-day trips/entries appear on every day). */
export function bucketByDay(items: CalItem[], days: Date[]) {
  const map = new Map<string, DayItem[]>(days.map((d) => [dayKey(d), []]));
  const first = days[0];
  const last = days[days.length - 1];
  for (const it of items) {
    const s = normalizeDay(it.start);
    const e = it.end ? normalizeDay(it.end) : s;
    let d = s < first ? first : s;
    const stop = e > last ? last : e;
    while (d <= stop) {
      map.get(dayKey(d))?.push({ ...it, isStart: sameDay(d, s), isEnd: sameDay(d, e) });
      d = addDaysLocal(d, 1);
    }
  }
  // Multi-day spans first so they line up across cells, then by time.
  for (const list of map.values()) list.sort((a, b) => Number(!!b.end && !sameDay(b.start, b.end!)) - Number(!!a.end && !sameDay(a.start, a.end!)) || a.start.getTime() - b.start.getTime());
  return map;
}

function itemHref(it: CalItem, entryBase: string) {
  if (it.href) return it.href;
  if (it.kind === "entry") return `${entryBase}${entryBase.includes("?") ? "&" : "?"}entry=${it.id.split(":")[1]}`;
  return null;
}

function Chip({ it, entryBase, locale, compact }: { it: DayItem; entryBase: string; locale: string; compact?: boolean }) {
  const href = itemHref(it, entryBase);
  const span = !!it.end && !sameDay(it.start, it.end);
  const Icon = KIND_ICONS[it.kind];
  const body = (
    <>
      {span ? <Icon className="size-3 shrink-0" aria-hidden /> : <span className="size-1.5 shrink-0 rounded-full" style={{ background: it.color }} aria-hidden />}
      {!span && !it.allDay && <span className="shrink-0 tabular-nums opacity-70">{formatTime(it.start, locale)}</span>}
      <span className="truncate">{it.title}</span>
    </>
  );
  const cls = cn(
    "flex min-w-0 items-center gap-1 px-1.5 py-0.5 text-[11px] leading-4 font-bold transition",
    span ? "text-white" : "rounded-md text-ink-2 hover:bg-surface-2",
    span && (it.isStart ? "ms-0 rounded-s-md" : "-ms-1.5 ps-2"),
    span && (it.isEnd ? "rounded-e-md" : "-me-1.5"),
    compact && "py-1 text-xs",
  );
  const style = span ? { background: it.color } : undefined;
  return href ? (
    <Link href={href} scroll={false} className={cls} style={style} title={it.title}>
      {body}
    </Link>
  ) : (
    <span className={cls} style={style} title={it.title}>
      {body}
    </span>
  );
}

/** Monday-first month grid (desktop). */
export function MonthGrid({ days, month, items, entryBase }: { days: Date[]; month: number; items: CalItem[]; entryBase: string }) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const byDay = bucketByDay(items, days);
  const wd = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short" });
  const today = normalizeDay();
  const MAX = 3;
  return (
    <div className="card overflow-visible">
      <div className="grid grid-cols-7 border-b border-line">
        {days.slice(0, 7).map((d) => (
          <div key={d.getDay()} className="px-2 py-2.5 text-center text-xs font-extrabold tracking-wide text-muted uppercase">
            {wd.format(d)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const list = byDay.get(dayKey(d)) ?? [];
          const out = d.getMonth() !== month;
          const isToday = sameDay(d, today);
          const weekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <div key={dayKey(d)} className={cn("relative min-h-32 border-line p-1.5", i % 7 !== 6 && "border-e", i < days.length - 7 && "border-b", out ? "bg-surface-2/50" : weekend ? "bg-canvas/60" : "")}>
              <div className="mb-1 flex items-center justify-between px-1">
                <span className={cn("grid size-7 place-items-center rounded-full text-sm font-extrabold", isToday ? "bg-brand-600 text-white shadow-[var(--shadow-brand)]" : out ? "text-muted/60" : "text-ink")}>{d.getDate()}</span>
              </div>
              <div className="space-y-0.5">
                {list.slice(0, MAX).map((it) => (
                  <Chip key={it.id} it={it} entryBase={entryBase} locale={locale} />
                ))}
                {list.length > MAX && (
                  <details className="group/more relative">
                    <summary className="cursor-pointer list-none rounded-md px-1.5 py-0.5 text-[11px] font-extrabold text-brand-700 hover:bg-brand-50 [&::-webkit-details-marker]:hidden">{t("more", { count: list.length - MAX })}</summary>
                    <div className="absolute start-0 top-6 z-30 w-60 space-y-0.5 rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow-lift)]">
                      <p className="mb-1 px-1.5 text-xs font-extrabold text-ink">{new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", day: "numeric", month: "long" }).format(d)}</p>
                      {list.map((it) => (
                        <Chip key={it.id} it={{ ...it, isStart: true, isEnd: true }} entryBase={entryBase} locale={locale} compact />
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Week view: seven columns of cards (desktop). */
export function WeekColumns({ days, items, entryBase }: { days: Date[]; items: CalItem[]; entryBase: string }) {
  const locale = useLocale();
  const t = useTranslations("calendar");
  const byDay = bucketByDay(items, days);
  const today = normalizeDay();
  const wd = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short" });
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d) => {
        const list = byDay.get(dayKey(d)) ?? [];
        const isToday = sameDay(d, today);
        return (
          <div key={dayKey(d)} className={cn("card min-h-80 p-2", isToday && "ring-2 ring-brand-200")}>
            <div className="mb-2 text-center">
              <p className="text-xs font-extrabold text-muted uppercase">{wd.format(d)}</p>
              <p className={cn("mx-auto grid size-9 place-items-center rounded-full font-display text-lg font-extrabold", isToday ? "bg-brand-600 text-white" : "text-ink")}>{d.getDate()}</p>
            </div>
            <div className="space-y-1.5">
              {list.map((it) => (
                <EventCard key={it.id} it={it} entryBase={entryBase} locale={locale} small />
              ))}
              {!list.length && <p className="pt-6 text-center text-xs text-muted/70">{t("free")}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventCard({ it, entryBase, locale, small }: { it: DayItem | CalItem; entryBase: string; locale: string; small?: boolean }) {
  const href = itemHref(it, entryBase);
  const Icon = KIND_ICONS[it.kind];
  const span = !!it.end && !sameDay(it.start, it.end);
  const inner = (
    <>
      <span className={cn("grid shrink-0 place-items-center rounded-xl text-white", small ? "size-7" : "size-10")} style={{ background: it.color }}>
        <Icon className={small ? "size-3.5" : "size-5"} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block font-bold text-ink", small ? "line-clamp-2 text-xs leading-tight" : "truncate")}>{it.title}</span>
        <span className={cn("block text-muted", small ? "text-[11px]" : "text-xs")}>
          <span dir="ltr">
            {it.allDay || span ? "" : formatTime(it.start, locale)}
            {!small && it.end && !it.allDay && !span ? ` – ${formatTime(it.end, locale)}` : ""}
          </span>
          {!small && it.location && (
            <span className="ms-1 inline-flex items-center gap-0.5">
              <MapPin className="inline size-3" /> {it.location}
            </span>
          )}
        </span>
      </span>
    </>
  );
  const cls = cn("flex items-start gap-2 rounded-xl border border-line bg-surface transition", small ? "p-1.5" : "p-3", href && "hover:border-transparent hover:shadow-[var(--shadow-lift)]");
  const style = { borderInlineStartColor: it.color, borderInlineStartWidth: 3 };
  return href ? (
    <Link href={href} scroll={false} className={cls} style={style}>
      {inner}
    </Link>
  ) : (
    <div className={cls} style={style}>
      {inner}
    </div>
  );
}

/** Day-grouped list (mobile month/week, and the agenda view). */
export function AgendaList({ days, items, entryBase }: { days: Date[]; items: CalItem[]; entryBase: string }) {
  const locale = useLocale();
  const t = useTranslations("calendar");
  const byDay = bucketByDay(items, days);
  const today = normalizeDay();
  const dayFmt = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long" });
  const monthFmt = new Intl.DateTimeFormat(intlLocale(locale), { month: "short" });
  const filled = days.filter((d) => (byDay.get(dayKey(d)) ?? []).length || sameDay(d, today));
  if (!filled.length) return <p className="card p-8 text-center text-sm text-muted">{t("emptyPeriod")}</p>;
  return (
    <ol className="space-y-3">
      {filled.map((d) => {
        const list = byDay.get(dayKey(d)) ?? [];
        const isToday = sameDay(d, today);
        return (
          <li key={dayKey(d)} className={cn("card flex gap-3 p-3 sm:gap-4 sm:p-4", isToday && "ring-2 ring-brand-200")}>
            <div className={cn("flex w-14 shrink-0 flex-col items-center justify-center self-start rounded-2xl py-2 text-center", isToday ? "bg-brand-600 text-white shadow-[var(--shadow-brand)]" : "bg-surface-2 text-ink")}>
              <span className="text-[10px] font-extrabold uppercase opacity-80">{monthFmt.format(d)}</span>
              <span className="font-display text-2xl leading-none font-extrabold">{d.getDate()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-sm font-extrabold text-ink capitalize">
                {dayFmt.format(d)} {isToday && <span className="ms-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] text-brand-700">{t("today")}</span>}
              </p>
              {list.length ? (
                <div className="space-y-2">
                  {list.map((it) => (
                    <EventCard key={it.id} it={it} entryBase={entryBase} locale={locale} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">{t("nothingToday")}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

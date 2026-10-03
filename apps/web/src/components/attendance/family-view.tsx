import { useLocale, useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { CalendarHeart } from "lucide-react";
import type { familyPage } from "@api/modules/attendance/routes";
import { formatDate, intlLocale } from "@onet/shared";
import { useApi } from "@/lib/query";
import type { Loaded } from "@/lib/types";
import { cn } from "@/lib/utils";
import { addDaysLocal, dayKey, normalizeDay, startOfWeek } from "@/components/attendance/day";
import { QueryView } from "@/components/states/page-state";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { ATTENDANCE_COLORS, attended } from "./status-style";

const WEEKS = 16;
const PRIORITY = ["ABSENT", "EXCUSED", "LATE", "PRESENT"] as const;

type Data = Loaded<typeof familyPage>;

/** Parents: their children's attendance as a calendar heatmap + recent history. */
export function FamilyView() {
  const query = useApi<Data>("/attendance/family");
  return (
    <QueryView query={query} skeleton={<Skeleton className="h-96 rounded-2xl" />}>
      {(d) => <FamilyPanel data={d.children} />}
    </QueryView>
  );
}

function FamilyPanel({ data }: { data: Data["children"] }) {
  const t = useTranslations("attendance.family");
  const tc = useTranslations("common");
  const locale = useLocale();
  if (!data.length)
    return (
      <div className="card">
        <EmptyState title={t("noChildren")} icon={<CalendarHeart className="size-4" />} />
      </div>
    );

  const today = normalizeDay();
  const firstMonday = addDaysLocal(startOfWeek(today), -(WEEKS - 1) * 7);
  const weekdayFmt = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "narrow" });
  const monthFmt = new Intl.DateTimeFormat(intlLocale(locale), { month: "short" });

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {data.map(({ child, records }) => {
        const total = records.length;
        const ok = records.filter((r) => attended(r.status)).length;
        const rate = total ? Math.round((ok / total) * 100) : null;
        const byDay = new Map<string, string>();
        for (const r of records) {
          const k = dayKey(r.date);
          const cur = byDay.get(k);
          if (!cur || PRIORITY.indexOf(r.status as (typeof PRIORITY)[number]) < PRIORITY.indexOf(cur as (typeof PRIORITY)[number])) byDay.set(k, r.status);
        }
        const color = child.group?.color ?? "#E30613";
        return (
          <section key={child.id} className="card overflow-hidden">
            <div className="flex items-center gap-4 p-5" style={{ background: `linear-gradient(120deg, ${color}1F, transparent 70%)` }}>
              <Avatar firstName={child.firstName} lastName={child.lastName} src={child.photoUrl} size="lg" ring />
              <div className="min-w-0 flex-1">
                <Link href={`/dashboard/members/${child.id}?tab=attendance`} className="font-display text-xl font-extrabold text-ink hover:text-brand-700">
                  {child.firstName}
                </Link>
                {child.group && (
                  <div className="mt-1">
                    <Badge color={child.group.color}>{child.group.name}</Badge>
                  </div>
                )}
              </div>
              <div className="text-end">
                <p className={cn("font-display text-3xl font-extrabold tabular-nums", rate == null ? "text-muted" : rate >= 80 ? "text-emerald-600" : rate >= 60 ? "text-amber-600" : "text-red-600")}>{rate == null ? "—" : `${rate}%`}</p>
                <p className="text-xs font-bold text-muted">{t("rate")}</p>
              </div>
            </div>

            <div className="px-5 pb-5">
              <div className="mb-4 grid grid-cols-4 gap-2 text-center">
                {(["PRESENT", "LATE", "EXCUSED", "ABSENT"] as const).map((s) => (
                  <div key={s} className="rounded-xl py-2" style={{ background: `${ATTENDANCE_COLORS[s]}14` }}>
                    <p className="font-display text-lg font-extrabold tabular-nums" style={{ color: ATTENDANCE_COLORS[s] }}>
                      {records.filter((r) => r.status === s).length}
                    </p>
                    <p className="truncate px-1 text-[11px] font-bold text-ink-2">{tc(`status.${s}`)}</p>
                  </div>
                ))}
              </div>

              {/* Heatmap: one column per week (Monday first), one row per weekday */}
              <p className="mb-2 text-xs font-extrabold tracking-wide text-muted uppercase">{t("heatmap", { count: WEEKS })}</p>
              <div className="overflow-x-auto pb-1">
                <div className="inline-flex gap-1">
                  <div className="grid grid-rows-7 gap-1 pe-1 pt-4">
                    {Array.from({ length: 7 }, (_, i) => (
                      <span key={i} className="grid h-4 place-items-center text-[10px] font-bold text-muted">
                        {weekdayFmt.format(addDaysLocal(firstMonday, i))}
                      </span>
                    ))}
                  </div>
                  {Array.from({ length: WEEKS }, (_, w) => {
                    const monday = addDaysLocal(firstMonday, w * 7);
                    const showMonth = w === 0 || monday.getDate() <= 7;
                    return (
                      <div key={w} className="flex w-4 flex-col gap-1">
                        <span className="h-3 text-[10px] leading-3 font-bold whitespace-nowrap text-muted">{showMonth ? monthFmt.format(monday) : ""}</span>
                        {Array.from({ length: 7 }, (_, d) => {
                          const day = addDaysLocal(monday, d);
                          const st = byDay.get(dayKey(day));
                          const fut = day > today;
                          return (
                            <span
                              key={d}
                              title={`${formatDate(day, locale)}${st ? ` · ${tc(`status.${st}`)}` : ""}`}
                              className={cn("size-4 rounded-[5px]", fut ? "bg-transparent" : !st && "bg-surface-2", dayKey(day) === dayKey(today) && "ring-2 ring-ink/30")}
                              style={st ? { background: ATTENDANCE_COLORS[st as keyof typeof ATTENDANCE_COLORS] } : undefined}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-bold text-ink-2">
                {(["PRESENT", "LATE", "EXCUSED", "ABSENT"] as const).map((s) => (
                  <span key={s} className="inline-flex items-center gap-1">
                    <span className="size-2.5 rounded-sm" style={{ background: ATTENDANCE_COLORS[s] }} /> {tc(`status.${s}`)}
                  </span>
                ))}
              </div>

              <p className="mt-5 mb-2 text-xs font-extrabold tracking-wide text-muted uppercase">{t("recent")}</p>
              {records.length ? (
                <ul className="divide-y divide-line">
                  {records.slice(0, 6).map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{formatDate(r.date, locale, "long")}</span>
                        <span className="block truncate text-xs text-muted">{r.group?.name ?? r.activity?.title ?? r.event?.title ?? r.trip?.title}</span>
                      </span>
                      <StatusBadge status={r.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">{t("noRecords")}</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

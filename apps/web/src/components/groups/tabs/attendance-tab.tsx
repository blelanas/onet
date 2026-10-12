import { useLocale, useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { ArrowRight, CalendarCheck, ClipboardCheck, Percent, TrendingUp } from "lucide-react";
import type { groupAttendanceTab } from "@api/modules/groups/routes";
import { intlLocale } from "@onet/shared";
import { can, useMe } from "@/lib/auth";
import { useApi } from "@/lib/query";
import type { Loaded } from "@/lib/types";
import { cn } from "@/lib/utils";
import { QueryView } from "@/components/states/page-state";
import { Avatar } from "@/components/ui/avatar";
import { BarsChart } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { Progress } from "@/components/ui/progress";
import { Section } from "@/components/ui/section";
import { ATTENDANCE_COLORS } from "@/components/attendance/status-style";

import { TabSkeleton } from "../grid-skeleton";
import type { Group } from "../types";

type Data = Loaded<typeof groupAttendanceTab>;

export function AttendanceTab({ group }: { group: Group }) {
  const query = useApi<Data>(`/groups/${group.id}/attendance`);
  return <QueryView query={query} skeleton={<TabSkeleton />}>{(data) => <AttendancePanel group={group} stats={data} />}</QueryView>;
}

function AttendancePanel({ group, stats }: { group: Group; stats: Data }) {
  const t = useTranslations("groups.attendance");
  const tc = useTranslations("common");
  const locale = useLocale();
  const user = useMe();
  const fmt = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short" });
  const last = stats.sessions.at(-1);
  const prev = stats.sessions.at(-2);

  if (!stats.sessions.length)
    return (
      <div className="card">
        <EmptyState
          title={t("empty")}
          description={t("emptyHint")}
          icon={<ClipboardCheck className="size-4" />}
          action={
            can(user, "attendance.manage") ? (
              <Link href={`/dashboard/attendance?ctx=group:${group.id}`} className="font-bold text-brand-700">
                {t("takeFirst")}
              </Link>
            ) : undefined
          }
        />
      </div>
    );

  const { ranking } = stats;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <KpiCard label={t("overall")} value={`${stats.overall ?? 0}%`} icon={<Percent className="size-5" />} accent="leaf" />
        <KpiCard label={t("sessions")} value={stats.sessions.length} icon={<CalendarCheck className="size-5" />} accent="sky" hint={t("lastWeeks", { count: 10 })} />
        <KpiCard
          label={t("lastSession")}
          value={last ? `${last.rate}%` : "—"}
          icon={<TrendingUp className="size-5" />}
          accent="grape"
          trend={last && prev ? last.rate - prev.rate : undefined}
          hint={last ? fmt.format(last.date) : undefined}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Section
          title={t("perSession")}
          className="lg:col-span-2"
          action={
            <Link href={`/dashboard/attendance?view=history&ctx=group:${group.id}`} className="inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:text-brand-700">
              {t("history")} <ArrowRight className="rtl-flip size-4" />
            </Link>
          }
        >
          <BarsChart
            stacked
            height={280}
            xKey="date"
            data={stats.sessions.map((s) => ({ date: fmt.format(s.date), PRESENT: s.present, LATE: s.late, EXCUSED: s.excused, ABSENT: s.absent }))}
            series={(["PRESENT", "LATE", "EXCUSED", "ABSENT"] as const).map((k) => ({ key: k, label: tc(`status.${k}`), color: ATTENDANCE_COLORS[k] }))}
          />
          <ul className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {stats.sessions.map((s) => (
              <li key={s.date.toISOString()} className="shrink-0 rounded-xl border border-line px-2.5 py-1.5 text-center">
                <span className="block text-[11px] font-bold text-muted">{fmt.format(s.date)}</span>
                <span className={cn("font-display text-sm font-extrabold", s.rate >= 80 ? "text-emerald-600" : s.rate >= 60 ? "text-amber-600" : "text-red-600")}>{s.rate}%</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t("watchList")}>
          {ranking.length ? (
            <ul className="space-y-3">
              {ranking.slice(0, 8).map((c) => (
                <li key={c.id}>
                  <Link href={`/dashboard/members/${c.id}?tab=attendance`} className="flex items-center gap-3 rounded-xl p-1 hover:bg-surface-2">
                    <Avatar firstName={c.firstName} lastName={c.lastName} src={c.photoUrl} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-bold text-ink">
                          {c.firstName} {c.lastName}
                        </span>
                        <span className="font-extrabold tabular-nums text-ink-2">{c.rate}%</span>
                      </span>
                      <Progress value={c.rate ?? 0} className="mt-1 h-1.5" color={(c.rate ?? 0) >= 80 ? "#2BB673" : (c.rate ?? 0) >= 60 ? "#FFB400" : "#E30613"} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{tc("states.empty")}</p>
          )}
        </Section>
      </div>
    </div>
  );
}

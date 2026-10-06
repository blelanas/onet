import { useLocale, useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { CalendarCheck, Download, Percent, UserX, Users } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import type { historyPage } from "@api/modules/attendance/routes";
import { intlLocale } from "@onet/shared";
import { download } from "@/lib/api";
import { useApi } from "@/lib/query";
import type { Loaded } from "@/lib/types";
import { cn } from "@/lib/utils";
import { dayKey } from "@/components/attendance/day";
import { QueryView } from "@/components/states/page-state";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { Section } from "@/components/ui/section";
import { FilterChips } from "@/components/ui/toolbar";
import { categoryColor } from "@/components/activities/category-icon";
import { ContextBar } from "./context-bar";
import { ATTENDANCE_COLORS, ATTENDANCE_TEXT_COLORS } from "./status-style";

const STATUSES = ["PRESENT", "LATE", "EXCUSED", "ABSENT"] as const;
const PERIODS = ["4", "8", "12", "26"];

type Data = Loaded<typeof historyPage>;

export function HistoryView({ ctxParam, weeksParam }: { ctxParam?: string; weeksParam?: string }) {
  const query = useApi<Data>("/attendance/history", { ctx: ctxParam, weeks: weeksParam });
  return (
    <QueryView query={query} skeleton={<Skeleton className="h-96 rounded-2xl" />}>
      {(data) => <HistoryPanel data={data} />}
    </QueryView>
  );
}

function HistoryPanel({ data }: { data: Data }) {
  const t = useTranslations("attendance");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { options, selected, sessions, rates, from, to } = data;
  const [exporting, startExport] = useTransition();
  const monthFmt = new Intl.DateTimeFormat(intlLocale(locale), { month: "short" });
  const byKey = new Map(options.map((o) => [o.key, o]));

  const totals = sessions.reduce(
    (a, s) => ({ ok: a.ok + (s.counts.PRESENT ?? 0) + (s.counts.LATE ?? 0), absent: a.absent + (s.counts.ABSENT ?? 0), total: a.total + s.total }),
    { ok: 0, absent: 0, total: 0 },
  );
  const exportCsv = () =>
    startExport(async () => {
      try {
        await download("/attendance/export.csv", { from, to, ctx: selected?.key });
      } catch {
        toast.error(tc("errors.unexpected"));
      }
    });

  return (
    <>
      <ContextBar options={options} ctx={selected?.key ?? ""} allowAll />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips param="weeks" allLabel={t("history.weeks", { count: 8 })} options={PERIODS.filter((p) => p !== "8").map((p) => ({ value: p, label: t("history.weeks", { count: Number(p) }) }))} />
        <Button variant="outline" onClick={exportCsv} loading={exporting}>
          <Download className="size-4" /> {tc("actions.exportCsv")}
        </Button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard label={t("history.sessions")} value={sessions.length} icon={<CalendarCheck className="size-5" />} accent="sky" />
        <KpiCard label={t("history.rate")} value={totals.total ? `${Math.round((totals.ok / totals.total) * 100)}%` : "—"} icon={<Percent className="size-5" />} accent="leaf" />
        <KpiCard label={t("history.absences")} value={totals.absent} icon={<UserX className="size-5" />} accent="brand" />
        <KpiCard label={t("history.children")} value={rates.length} icon={<Users className="size-5" />} accent="grape" />
      </div>

      {sessions.length ? (
        <div className="grid gap-5 lg:grid-cols-5">
          <Section title={t("history.sessionsList")} className="lg:col-span-3">
            <ul className="space-y-2.5">
              {sessions.map((s) => {
                const o = byKey.get(s.contextKey);
                const color = o ? (o.kind === "group" ? o.color : categoryColor(o.category ?? "")) : "#7a7390";
                const ok = (s.counts.PRESENT ?? 0) + (s.counts.LATE ?? 0);
                const rate = Math.round((ok / s.total) * 100);
                return (
                  <li key={`${s.contextKey}|${s.date.toISOString()}`}>
                    <Link href={`/dashboard/attendance?ctx=${encodeURIComponent(s.contextKey)}&date=${dayKey(s.date)}`} className="block rounded-2xl border border-line p-3 transition hover:border-transparent hover:shadow-[var(--shadow-lift)]">
                      <div className="flex items-center gap-3">
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl text-center leading-none text-white" style={{ background: color }}>
                          <span>
                            <span className="block font-display text-base font-extrabold">{s.date.getDate()}</span>
                            <span className="block text-[9px] font-bold uppercase">{monthFmt.format(s.date)}</span>
                          </span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-ink">{o?.name ?? s.contextKey}</p>
                          <p className="flex flex-wrap gap-x-3 text-xs font-bold">
                            {STATUSES.map((k) =>
                              s.counts[k] ? (
                                <span key={k} style={{ color: ATTENDANCE_TEXT_COLORS[k] }}>
                                  {tc(`status.${k}`)} {s.counts[k]}
                                </span>
                              ) : null,
                            )}
                          </p>
                        </div>
                        <span className={cn("font-display text-lg font-extrabold tabular-nums", rate >= 80 ? "text-emerald-600" : rate >= 60 ? "text-amber-600" : "text-red-600")}>{rate}%</span>
                      </div>
                      <div className="mt-2.5 flex h-1.5 overflow-hidden rounded-full bg-surface-2">
                        {STATUSES.map((k) => (
                          <span key={k} style={{ width: `${((s.counts[k] ?? 0) / s.total) * 100}%`, background: ATTENDANCE_COLORS[k] }} />
                        ))}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Section>
          <Section title={t("history.perChild")} className="lg:col-span-2">
            <ul className="divide-y divide-line">
              {rates.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <Avatar firstName={r.firstName} lastName={r.lastName} src={r.photoUrl} size="sm" />
                  <Link href={`/dashboard/members/${r.id}?tab=attendance`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink hover:text-brand-700">
                      {r.firstName} {r.lastName}
                    </span>
                    <span className="block text-xs text-muted">
                      {t("history.childLine", { present: (r.counts.PRESENT ?? 0) + (r.counts.LATE ?? 0), total: r.total, absent: r.counts.ABSENT ?? 0 })}
                    </span>
                  </Link>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-extrabold tabular-nums", r.rate >= 80 ? "bg-leaf-soft text-emerald-700" : r.rate >= 60 ? "bg-sun-soft text-amber-700" : "bg-red-50 text-red-700")}>{r.rate}%</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      ) : (
        <div className="card">
          <EmptyState title={t("history.empty")} description={t("history.emptyHint")} icon={<CalendarCheck className="size-4" />} />
        </div>
      )}
    </>
  );
}

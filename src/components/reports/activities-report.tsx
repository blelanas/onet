import { getTranslations } from "next-intl/server";
import { CheckCircle2, Sparkles, Users } from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/constants";
import { activitiesReport } from "@/server/reports/queries";
import { Badge } from "@/components/ui/badge";
import { BarsChart } from "@/components/ui/charts";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { Progress } from "@/components/ui/progress";
import { ChartCard, RateBadge } from "./chart-card";

export async function ActivitiesReport() {
  const t = await getTranslations("reports");
  const tc = await getTranslations("common");
  const r = await activitiesReport();
  const top = r.rows.slice(0, 8);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiCard label={t("activities.count")} value={r.rows.length} icon={<Sparkles className="size-5" />} accent="coral" />
        <KpiCard label={t("activities.participants")} value={r.totalParticipants} icon={<Users className="size-5" />} accent="grape" />
        <KpiCard label={t("activities.rate")} value={r.overallRate == null ? "—" : `${r.overallRate}%`} icon={<CheckCircle2 className="size-5" />} accent="leaf" className="col-span-2 lg:col-span-1" />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <ChartCard title={t("activities.popular")} hint={t("activities.popularHint")} className="lg:col-span-3">
          {top.length ? (
            <BarsChart data={top.map((a) => ({ name: a.title.length > 22 ? `${a.title.slice(0, 21)}…` : a.title, participants: a.participants }))} xKey="name" layout="vertical" height={Math.max(220, top.length * 38)} series={[{ key: "participants", label: t("columns.participants"), color: "#7C4DFF" }]} />
          ) : (
            <EmptyState compact title={t("empty")} />
          )}
        </ChartCard>
        <ChartCard title={t("activities.byGroup")} className="lg:col-span-2">
          {r.groupRates.length ? (
            <ul className="space-y-3.5">
              {r.groupRates.map((g) => (
                <li key={g.id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2 font-bold text-ink">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: g.color }} />
                      <span className="truncate">{g.name}</span>
                    </span>
                    <RateBadge rate={g.rate} />
                  </div>
                  <Progress value={g.rate ?? 0} color={g.color} label={g.name} />
                  <p className="mt-0.5 text-[11px] text-muted">
                    {g.attended} / {g.total} {t("activities.sessions").toLowerCase()}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact title={t("empty")} />
          )}
        </ChartCard>
      </div>

      <ChartCard title={t("activities.table")}>
        <DataTable
          rows={r.rows}
          rowKey={(a) => a.id}
          rowHref={(a) => `/dashboard/activities/${a.id}`}
          empty={<EmptyState compact title={t("empty")} />}
          columns={[
            {
              key: "name",
              header: t("columns.name"),
              cell: (a) => (
                <span className="flex flex-col">
                  <span className="font-bold text-ink">{a.title}</span>
                  {a.group && <span className="text-xs text-muted">{a.group.name}</span>}
                </span>
              ),
            },
            { key: "category", header: t("columns.category"), hideBelow: "lg", cell: (a) => <Badge color={CATEGORY_COLORS[a.category]}>{tc(`enums.activityCategory.${a.category}`)}</Badge> },
            { key: "participants", header: t("columns.participants"), align: "end", cell: (a) => <span className="font-bold tabular-nums">{a.participants} <span className="font-normal text-muted">/ {a.capacity}</span></span> },
            { key: "sessions", header: t("activities.sessions"), align: "end", hideBelow: "lg", cell: (a) => <span className="tabular-nums">{a.total}</span> },
            {
              key: "rate",
              header: t("columns.rate"),
              align: "end",
              cell: (a) => (
                <span className="inline-flex flex-col items-end">
                  <RateBadge rate={a.rate} />
                  {a.viaGroup && <span className="mt-0.5 text-[10px] text-muted">{t("activities.viaGroup")}</span>}
                </span>
              ),
            },
          ]}
        />
      </ChartCard>
    </div>
  );
}

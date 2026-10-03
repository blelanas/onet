import { getLocale, getTranslations } from "next-intl/server";
import { Bus, Coins, Gauge, Users } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { tripsReport } from "@/server/reports/queries";
import { BarsChart } from "@/components/ui/charts";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { ChartCard, RateBadge } from "./chart-card";

type Row = Awaited<ReturnType<typeof tripsReport>>["rows"][number];

export async function TripsReport({ showMoney }: { showMoney: boolean }) {
  const t = await getTranslations("reports");
  const locale = await getLocale();
  const r = await tripsReport();
  const fill = r.capacity ? Math.round((r.participants / r.capacity) * 100) : 0;
  const short = (s: string) => (s.length > 16 ? `${s.slice(0, 15)}…` : s);
  const chartRows = [...r.rows].reverse();

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: t("columns.name"),
      cell: (x) => (
        <span className="flex flex-col">
          <span className="font-bold text-ink">{x.title}</span>
          <span className="text-xs text-muted">
            {x.destination} · {formatDate(x.departAt, locale)}
          </span>
        </span>
      ),
    },
    { key: "status", header: t("columns.status"), hideBelow: "lg", cell: (x) => <StatusBadge status={x.status} /> },
    {
      key: "fill",
      header: t("columns.participants"),
      cell: (x) => (
        <span className="block min-w-28">
          <span className="text-sm font-bold tabular-nums">
            {x.participants} <span className="font-normal text-muted">/ {x.capacity}</span>
          </span>
          <Progress value={x.participants} max={x.capacity} color="#1683C0" className="mt-1 h-1.5" />
        </span>
      ),
    },
    ...(showMoney
      ? [
          { key: "expected", header: t("trips.expected"), align: "end" as const, hideBelow: "xl" as const, cell: (x: Row) => <span className="tabular-nums">{formatMoney(x.expected, locale)}</span> },
          { key: "collected", header: t("trips.collected"), align: "end" as const, cell: (x: Row) => <span className="font-bold tabular-nums">{formatMoney(x.revenue, locale)}</span> },
          { key: "rate", header: t("trips.collection"), align: "end" as const, hideBelow: "lg" as const, cell: (x: Row) => <RateBadge rate={x.collectionRate} /> },
        ]
      : []),
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label={t("trips.count")} value={r.rows.length} icon={<Bus className="size-5" />} accent="sky" />
        <KpiCard label={t("columns.participants")} value={`${r.participants} / ${r.capacity}`} icon={<Users className="size-5" />} accent="grape" />
        <KpiCard label={t("trips.fill")} value={`${fill}%`} icon={<Gauge className="size-5" />} accent="sun" />
        {showMoney && <KpiCard label={t("trips.collected")} value={formatMoney(r.revenue, locale)} hint={`${t("trips.expected")} ${formatMoney(r.expected, locale)}`} icon={<Coins className="size-5" />} accent="leaf" />}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title={t("trips.chart")}>
          {chartRows.length ? (
            <BarsChart
              data={chartRows.map((x) => ({ name: short(x.title), participants: x.participants, capacity: x.capacity }))}
              xKey="name"
              series={[
                { key: "participants", label: t("columns.participants"), color: "#1683C0" },
                { key: "capacity", label: t("columns.capacity"), color: "#C9BFD9" },
              ]}
            />
          ) : (
            <EmptyState compact title={t("empty")} />
          )}
        </ChartCard>
        {showMoney ? (
          <ChartCard title={t("trips.payments")}>
            {chartRows.length ? (
              <BarsChart
                data={chartRows.map((x) => ({ name: short(x.title), expected: Math.round(x.expected / 1000), collected: Math.round(x.revenue / 1000) }))}
                xKey="name"
                series={[
                  { key: "collected", label: t("trips.collected"), color: "#1E9460" },
                  { key: "expected", label: t("trips.expected"), color: "#D98B00" },
                ]}
              />
            ) : (
              <EmptyState compact title={t("empty")} />
            )}
          </ChartCard>
        ) : (
          <ChartCard title={t("trips.payments")}>
            <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">{t("finance.restricted")}</p>
          </ChartCard>
        )}
      </div>
      <ChartCard title={t("trips.table")}>
        <DataTable rows={r.rows} rowKey={(x) => x.id} rowHref={(x) => `/dashboard/trips/${x.id}`} columns={columns} empty={<EmptyState compact title={t("empty")} />} />
      </ChartCard>
    </div>
  );
}

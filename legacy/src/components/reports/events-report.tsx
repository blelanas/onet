import { getLocale, getTranslations } from "next-intl/server";
import { Coins, PartyPopper, Users } from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { eventsReport } from "@/server/reports/queries";
import { Badge } from "@/components/ui/badge";
import { BarsChart } from "@/components/ui/charts";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ChartCard, RateBadge } from "./chart-card";

type Row = Awaited<ReturnType<typeof eventsReport>>["rows"][number];

export async function EventsReport({ showMoney }: { showMoney: boolean }) {
  const t = await getTranslations("reports");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const r = await eventsReport();
  const chart = r.rows.filter((e) => e.participants + e.pending > 0).slice(0, 10).reverse();

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: t("columns.name"),
      cell: (e) => (
        <span className="flex flex-col">
          <span className="font-bold text-ink">{e.title}</span>
          <span className="text-xs text-muted">{formatDate(e.startAt, locale)}</span>
        </span>
      ),
    },
    { key: "category", header: t("columns.category"), hideBelow: "xl", cell: (e) => <Badge color={CATEGORY_COLORS[e.category]}>{tc(`enums.eventCategory.${e.category}`)}</Badge> },
    { key: "status", header: t("columns.status"), hideBelow: "lg", cell: (e) => <StatusBadge status={e.status} /> },
    { key: "participants", header: t("columns.participants"), align: "end", cell: (e) => <span className="font-bold tabular-nums">{e.participants} <span className="font-normal text-muted">/ {e.capacity}</span></span> },
    { key: "attended", header: t("events.attended"), align: "end", hideBelow: "lg", cell: (e) => (e.attendanceRate == null ? <span className="text-muted">—</span> : <span className="flex items-center justify-end gap-2 tabular-nums">{e.attended} <RateBadge rate={e.attendanceRate} /></span>) },
    ...(showMoney ? [{ key: "revenue", header: t("columns.revenue"), align: "end" as const, cell: (e: Row) => <span className="font-bold tabular-nums">{e.revenue ? formatMoney(e.revenue, locale) : "—"}</span> }] : []),
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiCard label={t("events.count")} value={r.rows.length} icon={<PartyPopper className="size-5" />} accent="grape" />
        <KpiCard label={t("events.participants")} value={r.participants} icon={<Users className="size-5" />} accent="sky" />
        {showMoney && <KpiCard label={t("events.revenue")} value={formatMoney(r.revenue, locale)} icon={<Coins className="size-5" />} accent="leaf" className="col-span-2 lg:col-span-1" />}
      </div>
      <ChartCard title={t("events.chart")}>
        {chart.length ? (
          <BarsChart
            data={chart.map((e) => ({ name: e.title.length > 18 ? `${e.title.slice(0, 17)}…` : e.title, participants: e.participants, pending: e.pending, attended: e.attended }))}
            xKey="name"
            series={[
              { key: "participants", label: t("events.participants"), color: "#1683C0" },
              { key: "attended", label: t("events.attended"), color: "#1E9460" },
              { key: "pending", label: t("columns.pending"), color: "#D98B00" },
            ]}
          />
        ) : (
          <EmptyState compact title={t("empty")} />
        )}
      </ChartCard>
      <ChartCard title={t("events.table")}>
        <DataTable rows={r.rows} rowKey={(e) => e.id} rowHref={(e) => `/dashboard/events/${e.id}`} columns={columns} empty={<EmptyState compact title={t("empty")} />} />
      </ChartCard>
    </div>
  );
}

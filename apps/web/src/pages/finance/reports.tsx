import { useLocale, useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { AlertTriangle, BarChart3, CalendarDays, Clock, Download, Landmark, MapPinned, TrendingDown, TrendingUp } from "lucide-react";
import type { financeReportsPage } from "@api/modules/finance/routes";
import { formatDate, intlLocale } from "@onet/shared";
import { download } from "@/lib/api";
import { useApi } from "@/lib/query";
import { useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { cn } from "@/lib/utils";
import { QueryView } from "@/components/states/page-state";
import { keepParams } from "@/components/finance/params";
import { Button } from "@/components/ui/button";
import { BarsChart, TrendChart } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import { Amount, AmountBars, EXPENSE_COLORS, METHOD_STYLE } from "@/components/finance/finance-ui";
import { MoneyDonut } from "@/components/finance/money-donut";
import { PeriodFilter } from "@/components/finance/period-filter";

type Data = Loaded<typeof financeReportsPage>;

const tnd = (m: number) => Math.round(m) / 1000;

/** /dashboard/finance/reports (finance staff). */
export function Component() {
  const sp = useSearchParamsObject();
  const query = useApi<Data>("/finance/reports", sp);
  return <QueryView query={query}>{(data) => <FinanceReportsPage data={data} sp={sp} />}</QueryView>;
}

function FinanceReportsPage({ data, sp }: { data: Data; sp: Record<string, string | undefined> }) {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const locale = useLocale();
  usePageTitle(t("titles.reports"));
  const { period, report: r } = data;
  const monthFmt = new Intl.DateTimeFormat(intlLocale(locale), { month: "short", year: "2-digit" });
  const trend = r.months.map((m) => ({ month: monthFmt.format(new Date(`${m.key}-01T00:00:00`)), revenue: tnd(m.revenue), expenses: tnd(m.expenses) }));
  const series = [
    { key: "revenue", label: t("columns.revenue"), color: "#1E9460" },
    { key: "expenses", label: t("columns.expenses"), color: "#E30613" },
  ];
  const short = (s: string) => (s.length > 22 ? `${s.slice(0, 21)}…` : s);
  const byKind = (kind: "event" | "trip") => r.margins.filter((m) => m.kind === kind).slice(0, 8).map((m) => ({ name: short(m.title), revenue: tnd(m.revenue), expenses: tnd(m.expenses) }));
  const events = byKind("event");
  const trips = byKind("trip");
  const exportParams = keepParams(sp, ["period", "from", "to"]);
  const empty = !r.kpis.revenue && !r.kpis.expenses;

  return (
    <>
      <PageHeader
        icon={<BarChart3 className="size-6" />}
        title={t("titles.reports")}
        description={t("descriptions.reports")}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.reports") }]}
        actions={
          <Button variant="outline" onClick={() => void download("/finance/reports/export.csv", exportParams)}>
            <Download className="size-4" /> {t("reports.exportMonthly")}
          </Button>
        }
      />
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PeriodFilter defaultKey="year" />
        {period.from && period.to && <p className="text-sm font-bold text-muted">{t("period.range", { from: formatDate(period.from, locale), to: formatDate(period.to, locale) })}</p>}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <KpiCard accent="leaf" icon={<TrendingUp className="size-5" />} label={t("reports.revenue")} value={<Amount value={r.kpis.revenue} />} hint={t("payments.count", { count: r.kpis.paymentsCount })} href="/dashboard/finance/payments" />
        <KpiCard accent="coral" icon={<TrendingDown className="size-5" />} label={t("reports.expenses")} value={<Amount value={r.kpis.expenses} />} href="/dashboard/finance/expenses" />
        <KpiCard
          accent={r.kpis.net >= 0 ? "sky" : "brand"}
          icon={<Landmark className="size-5" />}
          label={t("reports.net")}
          value={<Amount value={r.kpis.net} className={r.kpis.net < 0 ? "text-red-600" : undefined} />}
          hint={t("reports.netHint")}
          className="col-span-2 lg:col-span-1"
        />
        <KpiCard accent="sun" icon={<Clock className="size-5" />} label={t("reports.pending")} value={<Amount value={r.kpis.pending} />} hint={t("reports.snapshot", { count: r.outstanding.filter((i) => i.status !== "OVERDUE").length })} href="/dashboard/finance/invoices?status=PENDING" />
        <KpiCard accent="brand" icon={<AlertTriangle className="size-5" />} label={t("reports.overdue")} value={<Amount value={r.kpis.overdue} />} hint={t("reports.snapshot", { count: r.outstanding.filter((i) => i.status === "OVERDUE").length })} href="/dashboard/finance/invoices?status=OVERDUE" />
      </div>

      {empty ? (
        <div className="card mb-5">
          <EmptyState title={t("reports.noData")} description={t("reports.noDataHint")} />
        </div>
      ) : (
        <>
          <div className="mb-5 grid gap-5 lg:grid-cols-3 [&>*]:min-w-0">
            <Section title={t("reports.trend")} className="lg:col-span-2">
              <TrendChart data={trend} xKey="month" series={series} format="money" height={280} />
            </Section>
            <Section title={t("reports.methods")}>
              {r.methods.length ? (
                <MoneyDonut data={r.methods.map((m) => ({ key: m.method, name: tc(`enums.paymentMethod.${m.method}`), value: m.amount, color: (METHOD_STYLE[m.method] ?? METHOD_STYLE.OTHER).color }))} height={180} stacked />
              ) : (
                <p className="text-sm text-muted">{t("payments.empty")}</p>
              )}
            </Section>
          </div>

          <div className="mb-5 grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
            <Section title={<span className="flex items-center gap-2"><CalendarDays className="size-5 text-sky-600" /> {t("reports.byEvent")}</span>}>
              {events.length ? <BarsChart data={events} xKey="name" series={series} layout="vertical" height={Math.max(160, events.length * 52)} /> : <p className="text-sm text-muted">{t("reports.noData")}</p>}
            </Section>
            <Section title={<span className="flex items-center gap-2"><MapPinned className="size-5 text-emerald-600" /> {t("reports.byTrip")}</span>}>
              {trips.length ? <BarsChart data={trips} xKey="name" series={series} layout="vertical" height={Math.max(160, trips.length * 52)} /> : <p className="text-sm text-muted">{t("reports.noData")}</p>}
            </Section>
          </div>

          {r.margins.length > 0 && (
            <Section title={t("reports.marginTable")} className="mb-5">
              <div className="-mx-5 overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-surface-2/70">
                    <tr className="text-xs font-extrabold tracking-wide text-muted uppercase">
                      <th className="px-5 py-2.5 text-start">{t("columns.description")}</th>
                      <th className="px-3 py-2.5 text-end">{t("columns.revenue")}</th>
                      <th className="px-3 py-2.5 text-end">{t("columns.expenses")}</th>
                      <th className="px-3 py-2.5 text-end">{t("columns.margin")}</th>
                      <th className="px-5 py-2.5 text-end">{t("reports.marginRate")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {r.margins.map((m) => (
                      <tr key={`${m.kind}:${m.id}`} className="hover:bg-brand-50/40">
                        <td className="px-5 py-2.5">
                          <Link href={`/dashboard/${m.kind === "event" ? "events" : "trips"}/${m.id}`} className="flex items-center gap-2 font-bold text-ink hover:text-brand-700">
                            {m.kind === "event" ? <CalendarDays className="size-4 shrink-0 text-sky-600" /> : <MapPinned className="size-4 shrink-0 text-emerald-600" />}
                            <span className="truncate">{m.title}</span>
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-end"><Amount value={m.revenue} className="text-emerald-700" /></td>
                        <td className="px-3 py-2.5 text-end"><Amount value={m.expenses} className="text-red-600" /></td>
                        <td className="px-3 py-2.5 text-end font-bold"><Amount value={m.margin} signed /></td>
                        <td className="px-5 py-2.5 text-end text-xs font-bold text-ink-2 tabular-nums">{m.revenue ? `${Math.round((m.margin / m.revenue) * 100)}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </>
      )}

      <div className="grid gap-5 lg:grid-cols-3 [&>*]:min-w-0">
        <Section title={t("reports.outstanding")} href="/dashboard/finance/invoices?status=OVERDUE" actionLabel={t("actions.seeAll")} className="lg:col-span-2">
          {r.outstanding.length ? (
            <ul className="divide-y divide-line">
              {r.outstanding.slice(0, 8).map((i) => (
                <li key={i.id}>
                  <Link href={`/dashboard/finance/invoices/${i.id}`} className="flex items-center gap-3 py-2.5 hover:bg-brand-50/30">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-ink">
                        {i.payer.firstName} {i.payer.lastName}
                        {i.child && <span className="font-normal text-muted"> · {i.child.firstName}</span>}
                      </p>
                      <p className="truncate text-xs text-muted">
                        <span dir="ltr">{i.number}</span> · {i.description}
                      </p>
                    </div>
                    <div className="hidden text-end text-xs sm:block">
                      <p className={cn("font-bold", i.status === "OVERDUE" ? "text-red-600" : "text-ink-2")}>{formatDate(i.dueDate, locale)}</p>
                    </div>
                    <StatusBadge status={i.status} className="hidden sm:inline-flex" />
                    <Amount value={i.remaining} className="w-24 text-end font-bold text-ink" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{t("reports.nothingOutstanding")}</p>
          )}
        </Section>
        <Section title={t("reports.categories")}>
          {r.categories.length ? (
            <AmountBars items={r.categories.map((c) => ({ key: c.category, label: tc(`enums.expenseCategory.${c.category}`), amount: c.amount, color: EXPENSE_COLORS[c.category] ?? "#7a7390" }))} />
          ) : (
            <p className="text-sm text-muted">{t("expenses.empty")}</p>
          )}
        </Section>
      </div>
    </>
  );
}

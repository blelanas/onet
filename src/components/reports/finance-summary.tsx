import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Banknote, CircleDollarSign, Hourglass, Receipt, Scale, ShieldAlert } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { financeSummary } from "@/server/reports/queries";
import { DonutChart } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { ChartCard } from "./chart-card";

export async function FinanceSummary({ showMoney }: { showMoney: boolean }) {
  const t = await getTranslations("reports");
  const locale = await getLocale();
  if (!showMoney) {
    return (
      <div className="card">
        <EmptyState title={t("finance.title")} description={t("finance.restricted")} icon={<ShieldAlert className="size-4" />} />
      </div>
    );
  }
  const f = await financeSummary();
  const money = (v: number) => formatMoney(v, locale);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label={t("finance.invoiced")} value={money(f.invoiced)} icon={<Receipt className="size-5" />} accent="sky" />
        <KpiCard label={t("finance.collected")} value={money(f.collected)} icon={<Banknote className="size-5" />} accent="leaf" />
        <KpiCard label={t("finance.outstanding")} value={money(f.outstanding)} icon={<Hourglass className="size-5" />} accent="sun" hint={t("finance.overdue", { count: f.overdue })} />
        <KpiCard label={t("finance.expenses")} value={money(f.expenses)} icon={<CircleDollarSign className="size-5" />} accent="coral" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title={t("finance.title")}>
          <DonutChart
            data={[
              { name: t("finance.collected"), value: Math.round(f.collected / 1000), color: "#1E9460" },
              { name: t("finance.outstanding"), value: Math.round(f.outstanding / 1000), color: "#D98B00" },
            ]}
            centerValue={f.invoiced ? `${Math.round((f.collected / f.invoiced) * 100)}%` : "—"}
            centerLabel={t("finance.collected")}
          />
        </ChartCard>
        <div className="grid gap-5">
          <div className="card relative overflow-hidden p-5">
            <div className="flex items-center gap-3">
              <span className={`grid size-12 place-items-center rounded-2xl ${f.balance >= 0 ? "bg-leaf-soft text-emerald-700" : "bg-red-50 text-red-700"}`}>
                <Scale className="size-6" />
              </span>
              <div>
                <p className="text-sm font-bold text-muted">{t("finance.balance")}</p>
                <p className={`font-display text-3xl font-extrabold tabular-nums ${f.balance >= 0 ? "text-emerald-700" : "text-red-700"}`}>{money(f.balance)}</p>
              </div>
            </div>
          </div>
          <Link href="/dashboard/finance/reports" className="card card-hover group relative overflow-hidden bg-gradient-to-br from-ink to-ink-2 p-5 text-white">
            <div className="bg-confetti absolute inset-0 opacity-30" aria-hidden />
            <div className="relative flex items-center justify-between gap-4">
              <div>
                <p className="text-lg font-extrabold">{t("finance.detailed")}</p>
                <p className="mt-1 text-sm text-white/75">{t("finance.detailedHint")}</p>
              </div>
              <ArrowRight className="rtl-flip size-6 shrink-0 transition group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

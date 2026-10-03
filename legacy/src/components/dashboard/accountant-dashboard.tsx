import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle2, CircleDollarSign, Clock, HandCoins, Receipt, Scale, Wallet } from "lucide-react";
import type { CurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/guards";
import { formatDate, intlLocale, relativeTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { paidAmount } from "@/lib/services/invoices";
import { accountantDashboard } from "@/server/dashboard/accountant";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BarsChart, TrendChart } from "@/components/ui/charts";
import { KpiCard } from "@/components/ui/kpi-card";
import { Progress } from "@/components/ui/progress";
import { Section } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import { ChartTitle } from "./admin-dashboard";
import { GreetingHeader } from "./greeting-header";
import { NotificationList, QuickAction } from "./widgets";

export async function AccountantDashboard({ user }: { user: CurrentUser }) {
  const d = await accountantDashboard(user.id);
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const locale = await getLocale();
  const month = (date: Date) => new Intl.DateTimeFormat(intlLocale(locale), { month: "short" }).format(date);
  const k = d.kpis;
  const totalInvoices = k.paidCount + k.unpaidCount;
  const collectionRate = totalInvoices ? Math.round((k.paidCount / totalInvoices) * 100) : 0;
  const now = Date.now();

  return (
    <div className="space-y-5 sm:space-y-6">
      <GreetingHeader name={user.name} subtitle={t("greeting.subtitle.accountant")} theme="finance">
        <div className="rounded-2xl bg-white/15 px-4 py-3 ring-1 ring-white/30 backdrop-blur">
          <p className="text-xs font-bold text-white/80">{t("accountant.netYear", { year: new Date().getFullYear() })}</p>
          <p className="font-display text-2xl font-extrabold tabular-nums">{formatMoney(k.netYear, locale)}</p>
        </div>
      </GreetingHeader>

      {can(user, "finance.manage") && (
        <section aria-label={t("sections.quickActions")} className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-3 sm:px-0 lg:grid-cols-6">
          <QuickAction href="/dashboard/finance/payments" label={t("quick.recordPayment")} icon={HandCoins} color="#2BB673" />
          <QuickAction href="/dashboard/finance/invoices" label={tn("items.invoices")} icon={Receipt} color="#1E9BD7" />
          <QuickAction href="/dashboard/finance/reports" label={tn("items.financeReports")} icon={BarChart3} color="#7C4DFF" />
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label={t("accountant.revenue")} value={formatMoney(k.revenue, locale)} icon={<ArrowUpRight className="rtl-flip size-5" />} accent="leaf" href="/dashboard/finance/payments" />
        <KpiCard label={t("accountant.expenses")} value={formatMoney(k.expenses, locale)} icon={<ArrowDownRight className="rtl-flip size-5" />} accent="coral" href="/dashboard/finance/expenses" />
        <KpiCard
          label={t("accountant.net")}
          value={<span className={k.net < 0 ? "text-red-600" : undefined}>{formatMoney(k.net, locale)}</span>}
          icon={<Scale className="size-5" />}
          accent={k.net < 0 ? "brand" : "teal"}
          href="/dashboard/finance/reports"
        />
        <KpiCard label={t("accountant.pending")} value={formatMoney(k.pending, locale)} icon={<Clock className="size-5" />} accent="sun" hint={t("kpi.invoicesHint", { count: k.pendingCount })} href="/dashboard/finance/invoices" />
        <KpiCard label={t("accountant.overdue")} value={formatMoney(k.overdue, locale)} icon={<AlertTriangle className="size-5" />} accent="brand" hint={t("kpi.invoicesHint", { count: k.overdueCount })} href="/dashboard/finance/invoices?status=OVERDUE" />
        <div className="card flex flex-col justify-between p-4 sm:p-5">
          <p className="text-xs font-bold text-muted sm:text-sm">{t("accountant.collectionRate")}</p>
          <p className="font-display text-2xl font-extrabold text-ink tabular-nums sm:text-3xl">{collectionRate}%</p>
          <Progress value={collectionRate} color="#1E9460" className="mt-2" label={t("accountant.collectionRate")} />
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="size-3" /> {k.paidCount} {t("accountant.paidInvoices").toLowerCase()}
            </span>
            <span className="flex items-center gap-1 text-amber-700">
              <CircleDollarSign className="size-3" /> {k.unpaidCount} {t("accountant.unpaidInvoices").toLowerCase()}
            </span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Section title={<ChartTitle title={t("charts.revenueVsExpenses")} hint={t("charts.sixMonths")} />} className="lg:col-span-3">
          <TrendChart
            data={d.trend.map((r) => ({ month: month(r.month), revenue: r.revenue / 1000, expenses: r.expenses / 1000 }))}
            xKey="month"
            series={[
              { key: "revenue", label: t("charts.revenue") },
              { key: "expenses", label: t("charts.expenses"), color: "#E30613" },
            ]}
            format="money"
          />
        </Section>
        <Section title={<ChartTitle title={t("accountant.byItem")} hint={t("accountant.byItemHint")} />} className="lg:col-span-2">
          {d.byItem.length ? (
            <BarsChart
              data={d.byItem.map((r) => ({ name: r.title.length > 18 ? `${r.title.slice(0, 17)}…` : r.title, billed: r.billed / 1000, collected: r.collected / 1000 }))}
              xKey="name"
              layout="vertical"
              series={[
                { key: "billed", label: t("accountant.billed") },
                { key: "collected", label: t("accountant.collected"), color: "#1E9460" },
              ]}
              height={Math.max(220, d.byItem.length * 56)}
            />
          ) : (
            <p className="py-10 text-center text-sm text-muted">{t("empty.data")}</p>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Section title={t("accountant.overdueInvoices")} href="/dashboard/finance/invoices?status=OVERDUE" actionLabel={tc("actions.viewAll")} className="lg:col-span-2">
          {d.overdueList.length ? (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {d.overdueList.map((inv) => {
                const late = Math.max(0, Math.floor((now - inv.dueDate.getTime()) / 86400_000));
                return (
                  <li key={inv.id}>
                    <Link href={`/dashboard/finance/invoices/${inv.id}`} className="card-hover block rounded-2xl border border-red-100 bg-red-50/40 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-ink">
                            {inv.payer.firstName} {inv.payer.lastName}
                          </p>
                          <p className="truncate text-xs text-muted">{inv.description}</p>
                        </div>
                        <StatusBadge status="OVERDUE" />
                      </div>
                      <div className="mt-3 flex items-end justify-between gap-2">
                        <div>
                          <p className="font-display text-xl font-extrabold text-red-700 tabular-nums">{formatMoney(inv.amount - paidAmount(inv), locale)}</p>
                          <p className="text-[11px] font-bold text-muted" dir="ltr">
                            {inv.number}
                          </p>
                        </div>
                        <Badge tone="danger">{t("accountant.daysLate", { count: late })}</Badge>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="flex items-center justify-center gap-2 rounded-2xl bg-leaf-soft px-4 py-8 text-sm font-bold text-emerald-700">
              <CheckCircle2 className="size-5" /> {t("accountant.noOverdue")}
            </p>
          )}
        </Section>
        <Section title={t("accountant.recentPayments")} href="/dashboard/finance/payments" actionLabel={tc("actions.viewAll")}>
          {d.recentPayments.length ? (
            <ul className="space-y-1">
              {d.recentPayments.map((p) => (
                <li key={p.id}>
                  <Link href={`/dashboard/finance/invoices/${p.invoiceId}`} className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-surface-2/60">
                    <Avatar firstName={p.invoice.payer.firstName} lastName={p.invoice.payer.lastName} src={p.invoice.payer.photoUrl} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">
                        {p.invoice.payer.firstName} {p.invoice.payer.lastName}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {tc(`enums.paymentMethod.${p.method}`)} · {relativeTime(p.paidAt, locale)}
                      </span>
                    </span>
                    <span className="text-sm font-extrabold text-emerald-700 tabular-nums">+{formatMoney(p.amount, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted">{t("accountant.noPayments")}</p>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Section title={t("sections.notifications")} href="/dashboard/notifications" actionLabel={tc("actions.viewAll")} className="lg:col-span-1">
          <NotificationList items={d.notifications} empty={t("empty.notifications")} />
        </Section>
        <div className={cn("card relative overflow-hidden p-5 lg:col-span-2")}>
          <div className="bg-confetti absolute inset-0 opacity-50" aria-hidden />
          <div className="relative flex h-full flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <span className="grid size-14 place-items-center rounded-2xl bg-leaf-soft text-emerald-700">
                <Wallet className="size-7" />
              </span>
              <div>
                <p className="text-sm font-bold text-muted">{t("accountant.revenueYear", { year: new Date().getFullYear() })}</p>
                <p className="font-display text-3xl font-extrabold text-ink tabular-nums">{formatMoney(k.revenueYear, locale)}</p>
                <p className="text-xs text-muted">{formatDate(new Date(new Date().getFullYear(), 0, 1), locale)} – {formatDate(new Date(), locale)}</p>
              </div>
            </div>
            <Link href="/dashboard/finance/reports" className="inline-flex items-center gap-2 self-start rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white hover:bg-ink-2 sm:self-auto">
              <BarChart3 className="size-4" /> {tn("items.financeReports")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

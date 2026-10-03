import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronRight, Download, Undo2, Wallet } from "lucide-react";
import { formatDate, formatTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/constants";
import { canManageFinance, requireFinancePage } from "@/server/finance/access";
import { listPayments, type PaymentRow } from "@/server/finance/payments";
import { keepParams, resolvePeriod } from "@/server/finance/period";
import { refundPayment } from "@/server/finance/actions";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination, paging } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterSelect, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { Amount, METHOD_STYLE, MethodBadge } from "@/components/finance/finance-ui";
import { MoneyDonut } from "@/components/finance/money-donut";
import { PeriodFilter } from "@/components/finance/period-filter";

export async function generateMetadata() {
  const t = await getTranslations("finance.titles");
  return { title: t("payments") };
}

const BASE = "/dashboard/finance/payments";
type SP = Record<string, string | string[] | undefined>;

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { user, mode } = await requireFinancePage();
  const sp = await searchParams;
  const t = await getTranslations("finance");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const locale = await getLocale();
  const family = mode === "family";
  const manage = canManageFinance(user);
  const str = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);
  const { page, pageSize, skip, take } = paging(sp, family ? 30 : 20);
  const period = resolvePeriod(sp);
  const { rows, total, methods, received } = await listPayments(user, { q: str("q"), method: str("method"), status: str("status"), period, skip, take });
  const title = family ? t("titles.myPayments") : t("titles.payments");
  const exportQs = keepParams(sp, ["q", "method", "status", "period", "from", "to"]);

  const columns: Column<PaymentRow>[] = [
    {
      key: "date",
      header: t("columns.date"),
      cell: (p) => (
        <span className="block">
          <span className="block font-bold text-ink">{formatDate(p.paidAt, locale)}</span>
          <span className="block text-xs text-muted">{formatTime(p.paidAt, locale)}</span>
        </span>
      ),
    },
    {
      key: "invoice",
      header: t("columns.invoice"),
      cell: (p) => (
        <span className="flex items-center gap-2">
          <Avatar firstName={p.invoice.payer.firstName} lastName={p.invoice.payer.lastName} src={p.invoice.payer.photoUrl} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-bold text-ink">
              {p.invoice.payer.firstName} {p.invoice.payer.lastName}
            </span>
            <Link href={`/dashboard/finance/invoices/${p.invoice.id}`} className="block text-xs font-bold text-brand-600 tabular-nums hover:underline" dir="ltr">
              {p.invoice.number}
            </Link>
          </span>
        </span>
      ),
    },
    { key: "method", header: t("columns.method"), cell: (p) => <MethodBadge method={p.method} /> },
    { key: "reference", header: t("columns.reference"), hideBelow: "lg", cell: (p) => (p.reference ? <span className="font-mono text-xs text-ink-2" dir="ltr">{p.reference}</span> : <span className="text-muted">—</span>) },
    { key: "by", header: t("columns.recordedBy"), hideBelow: "xl", cell: (p) => <span className="text-sm text-ink-2">{p.recordedBy?.name ?? "—"}</span> },
    {
      key: "amount",
      header: t("columns.amount"),
      align: "end",
      cell: (p) => (
        <span className="inline-flex flex-col items-end gap-0.5">
          <Amount value={p.amount} className={p.status === "COMPLETED" ? "font-bold text-ink" : "font-bold text-muted line-through"} />
          {p.status !== "COMPLETED" && <StatusBadge status={p.status} />}
        </span>
      ),
    },
    ...(manage
      ? [
          {
            key: "actions",
            header: <span className="sr-only">{tc("fields.actions")}</span>,
            align: "end" as const,
            cell: (p: PaymentRow) =>
              p.status === "COMPLETED" ? (
                <ConfirmButton
                  action={refundPayment.bind(null, p.id)}
                  title={t("confirm.refundTitle")}
                  description={t("confirm.refundText", { amount: formatMoney(p.amount, locale) })}
                  successMessage={t("toast.refunded")}
                  confirmLabel={t("actions.refund")}
                  ariaLabel={t("actions.refund")}
                  size="icon-sm"
                >
                  <Undo2 className="size-4" />
                </ConfirmButton>
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        icon={<Wallet className="size-6" />}
        title={title}
        description={family ? t("descriptions.myPayments") : t("descriptions.payments")}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: title }]}
        actions={
          !family ? (
            <a href={`/api/finance/payments/export${exportQs ? `?${exportQs}` : ""}`} className={buttonClasses("outline", "md")}>
              <Download className="size-4" /> {tc("actions.exportCsv")}
            </a>
          ) : undefined
        }
      />

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-leaf to-teal p-5 text-white shadow-[var(--shadow-lift)]">
          <div className="bg-confetti pointer-events-none absolute inset-0 opacity-25" aria-hidden />
          <p className="relative text-sm font-bold opacity-90">{t("payments.received")}</p>
          <p className="relative mt-1 font-display text-3xl font-extrabold tabular-nums sm:text-4xl">
            {formatMoney(received, locale)}
          </p>
          <p className="relative mt-1 text-sm font-semibold opacity-90">{t("payments.count", { count: methods.reduce((s, m) => s + m.count, 0) })}</p>
          {methods.length > 0 && (
            <ul className="relative mt-5 flex flex-wrap gap-2">
              {methods.map((m) => (
                <li key={m.method} className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold backdrop-blur-sm">
                  {tc(`enums.paymentMethod.${m.method}`)} · {m.count}
                </li>
              ))}
            </ul>
          )}
        </div>
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-3 text-lg font-bold text-ink">{t("payments.byMethod")}</h2>
          {methods.length ? (
            <MoneyDonut height={170} data={methods.map((m) => ({ key: m.method, name: tc(`enums.paymentMethod.${m.method}`), value: m.amount, color: (METHOD_STYLE[m.method] ?? METHOD_STYLE.OTHER).color }))} />
          ) : (
            <p className="text-sm text-muted">{t("payments.empty")}</p>
          )}
        </section>
      </div>

      <Toolbar>
        {!family && <SearchBox placeholder={t("filters.searchPayments")} />}
        <FilterSelect param="method" allLabel={t("filters.allMethods")} options={PAYMENT_METHODS.map((m) => ({ value: m, label: tc(`enums.paymentMethod.${m}`) }))} />
        {!family && <FilterSelect param="status" allLabel={t("filters.allStatuses")} options={PAYMENT_STATUSES.map((s) => ({ value: s, label: tc(`status.${s}`) }))} />}
      </Toolbar>
      <PeriodFilter className="mb-4" />

      {family ? (
        rows.length ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {rows.map((p) => {
              const s = METHOD_STYLE[p.method] ?? METHOD_STYLE.OTHER;
              const Icon = s.icon;
              return (
                <li key={p.id} className="card card-hover relative flex items-center gap-4 p-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl text-white" style={{ background: s.color }}>
                    <Icon className="size-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/dashboard/finance/invoices/${p.invoice.id}`} className="block truncate font-bold text-ink after:absolute after:inset-0">
                      {p.invoice.description}
                    </Link>
                    <p className="text-xs text-muted">
                      {formatDate(p.paidAt, locale)} · {tc(`enums.paymentMethod.${p.method}`)}
                      {p.invoice.child && ` · ${p.invoice.child.firstName}`}
                    </p>
                    {p.status !== "COMPLETED" && <StatusBadge status={p.status} className="mt-1" />}
                  </div>
                  <div className="text-end">
                    <Amount value={p.amount} className={p.status === "COMPLETED" ? "block font-display text-lg font-extrabold text-ink" : "block font-display text-lg font-extrabold text-muted line-through"} />
                    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-brand-600">
                      {t("actions.receipt")} <ChevronRight className="rtl-flip size-3.5" />
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="card">
            <EmptyState title={t("payments.empty")} description={t("payments.emptyHint")} />
          </div>
        )
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(p) => p.id}
          mobileCard={(p) => (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">
                  {p.invoice.payer.firstName} {p.invoice.payer.lastName}
                </p>
                <p className="text-xs text-muted">
                  {formatDate(p.paidAt, locale)} ·{" "}
                  <Link href={`/dashboard/finance/invoices/${p.invoice.id}`} className="font-bold text-brand-600" dir="ltr">
                    {p.invoice.number}
                  </Link>
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <MethodBadge method={p.method} />
                  {p.status !== "COMPLETED" && <StatusBadge status={p.status} />}
                </div>
              </div>
              <Amount value={p.amount} className={p.status === "COMPLETED" ? "font-display text-lg font-extrabold text-ink" : "font-display text-lg font-extrabold text-muted line-through"} />
            </div>
          )}
          empty={
            <div className="card">
              <EmptyState title={t("payments.empty")} description={t("payments.emptyHint")} />
            </div>
          }
        />
      )}
      <Pagination page={page} pageSize={pageSize} total={total} basePath={BASE} searchParams={sp} />
    </>
  );
}

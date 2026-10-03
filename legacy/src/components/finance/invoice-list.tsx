import { getLocale, getTranslations } from "next-intl/server";
import { AlertCircle, Download, Plus } from "lucide-react";
import type { CurrentUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { canManageFinance } from "@/server/finance/access";
import { INVOICE_TABS, linkFilterOptions, listInvoices, type InvoiceRow } from "@/server/finance/queries";
import { keepParams, resolvePeriod } from "@/server/finance/period";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses, LinkButton } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, paging } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { LinkTabs } from "@/components/ui/tabs";
import { FilterSelect, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { Amount, TotalsStrip } from "./finance-ui";
import { PeriodFilter } from "./period-filter";

type SP = Record<string, string | string[] | undefined>;
const BASE = "/dashboard/finance/invoices";

function DueDate({ row, locale }: { row: InvoiceRow; locale: string }) {
  const late = row.status === "OVERDUE" || (row.status === "PARTIALLY_PAID" && row.dueDate < new Date());
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm whitespace-nowrap", late ? "font-bold text-red-600" : "text-ink-2")}>
      {late && <AlertCircle className="size-3.5" aria-hidden />}
      {formatDate(row.dueDate, locale)}
    </span>
  );
}

export async function InvoiceList({ user, searchParams }: { user: CurrentUser; searchParams: SP }) {
  const t = await getTranslations("finance");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const str = (k: string) => (typeof searchParams[k] === "string" && searchParams[k] ? (searchParams[k] as string) : undefined);
  const status = (INVOICE_TABS as readonly string[]).includes(str("status") ?? "") ? str("status")! : "all";
  const { page, pageSize, skip, take } = paging(searchParams, 15);
  const period = resolvePeriod(searchParams);
  const [{ rows, total, counts, totals }, links] = await Promise.all([listInvoices(user, { q: str("q"), status, link: str("link"), period, skip, take }), linkFilterOptions()]);
  const canManage = canManageFinance(user);

  const tabHref = (k: string) => {
    const qs = keepParams(searchParams, ["q", "link", "period", "from", "to"]);
    const sp = new URLSearchParams(qs);
    if (k !== "all") sp.set("status", k);
    const s = sp.toString();
    return `${BASE}${s ? `?${s}` : ""}`;
  };

  const columns: Column<InvoiceRow>[] = [
    {
      key: "number",
      header: t("columns.invoice"),
      cell: (r) => (
        <span className="block min-w-0">
          <span className="block font-display font-extrabold text-ink tabular-nums" dir="ltr">
            {r.number}
          </span>
          <span className="block max-w-[16rem] truncate text-xs text-muted">{r.description}</span>
        </span>
      ),
    },
    {
      key: "payer",
      header: t("columns.payer"),
      cell: (r) => (
        <span className="flex items-center gap-2">
          <Avatar firstName={r.payer.firstName} lastName={r.payer.lastName} src={r.payer.photoUrl} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-bold text-ink">
              {r.payer.firstName} {r.payer.lastName}
            </span>
            {r.child && <span className="block truncate text-xs text-muted">{t("payments.for", { child: r.child.firstName })}</span>}
          </span>
        </span>
      ),
    },
    { key: "due", header: t("columns.due"), hideBelow: "lg", cell: (r) => <DueDate row={r} locale={locale} /> },
    { key: "amount", header: t("columns.amount"), align: "end", cell: (r) => <Amount value={r.amount} className="font-bold text-ink" /> },
    {
      key: "remaining",
      header: t("columns.remaining"),
      align: "end",
      hideBelow: "lg",
      cell: (r) => (r.status === "CANCELLED" || r.status === "DRAFT" ? <span className="text-muted">—</span> : <Amount value={r.remaining} className={r.remaining ? "font-bold text-amber-700" : "text-emerald-700"} />),
    },
    { key: "status", header: t("columns.status"), cell: (r) => <StatusBadge status={r.status} /> },
  ];

  const exportQs = keepParams(searchParams, ["q", "status", "link", "period", "from", "to"]);

  return (
    <>
      <TotalsStrip {...totals} />
      <LinkTabs active={status} tabs={INVOICE_TABS.map((k) => ({ key: k, label: t(`tabs.${k}`), href: tabHref(k), count: counts[k] ?? 0 }))} />
      <Toolbar>
        <SearchBox placeholder={t("filters.searchInvoices")} />
        <FilterSelect
          param="link"
          allLabel={t("filters.allLinks")}
          options={[
            ...links.events.map((e) => ({ value: `event:${e.id}`, label: `${t("invoice.event")} · ${e.title}` })),
            ...links.trips.map((x) => ({ value: `trip:${x.id}`, label: `${t("invoice.trip")} · ${x.title}` })),
          ]}
          className="sm:max-w-64"
        />
        <div className="flex gap-2 sm:ms-auto">
          <a href={`/api/finance/invoices/export${exportQs ? `?${exportQs}` : ""}`} className={buttonClasses("outline", "md")}>
            <Download className="size-4" /> <span className="hidden sm:inline">{tc("actions.exportCsv")}</span>
          </a>
          {canManage && (
            <LinkButton href={`${BASE}/new`}>
              <Plus className="size-4" /> {t("actions.newInvoice")}
            </LinkButton>
          )}
        </div>
      </Toolbar>
      <PeriodFilter className="mb-4" />
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        rowHref={(r) => `${BASE}/${r.id}`}
        mobileCard={(r) => (
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display font-extrabold text-ink tabular-nums" dir="ltr">
                  {r.number}
                </p>
                <p className="truncate text-sm text-ink-2">{r.description}</p>
              </div>
              <StatusBadge status={r.status} />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Avatar firstName={r.payer.firstName} lastName={r.payer.lastName} src={r.payer.photoUrl} size="xs" />
              <span className="truncate font-bold text-ink">
                {r.payer.firstName} {r.payer.lastName}
              </span>
              {r.child && <span className="truncate text-xs text-muted">· {r.child.firstName}</span>}
            </div>
            <div className="flex items-end justify-between gap-3 border-t border-dashed border-line pt-2.5">
              <DueDate row={r} locale={locale} />
              <div className="text-end">
                <Amount value={r.amount} className="block font-display text-lg font-extrabold text-ink" />
                {r.remaining > 0 && r.remaining < r.amount && (
                  <span className="text-xs font-bold text-amber-700">
                    {t("columns.remaining")} <Amount value={r.remaining} />
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        empty={
          <div className="card">
            <EmptyState
              title={t("empty.invoices")}
              description={t("empty.invoicesHint")}
              action={canManage ? <LinkButton href={`${BASE}/new`}><Plus className="size-4" /> {t("actions.newInvoice")}</LinkButton> : undefined}
            />
          </div>
        }
      />
      <Pagination page={page} pageSize={pageSize} total={total} basePath={BASE} searchParams={searchParams} />
    </>
  );
}

import { useLocale, useTranslations } from "use-intl";
import { AlertCircle, Download, Plus } from "lucide-react";
import type { invoicesPage } from "@api/modules/finance/routes";
import type { InvoiceRow } from "@api/modules/finance/queries";
import type { Loaded } from "@/lib/types";
import { download } from "@/lib/api";
import { formatDate } from "@onet/shared";
import { cn } from "@/lib/utils";
import { INVOICE_TABS, keepParams, toQs } from "./params";
import { Avatar } from "@/components/ui/avatar";
import { Button, LinkButton } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { LinkTabs } from "@/components/ui/tabs";
import { FilterSelect, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { Amount, TotalsStrip } from "./finance-ui";
import { PeriodFilter } from "./period-filter";

type SP = Record<string, string | string[] | undefined>;
const BASE = "/dashboard/finance/invoices";

function DueDate({ row, locale }: { row: InvoiceRow; locale: string }) {
  const late = row.status === "OVERDUE" || (row.status === "PARTIALLY_PAID" && new Date(row.dueDate) < new Date());
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm whitespace-nowrap", late ? "font-bold text-red-600" : "text-ink-2")}>
      {late && <AlertCircle className="size-3.5" aria-hidden />}
      {formatDate(row.dueDate, locale)}
    </span>
  );
}

type StaffList = NonNullable<Loaded<typeof invoicesPage>["list"]>;

export function InvoiceList({ data, canManage, searchParams }: { data: StaffList; canManage: boolean; searchParams: SP }) {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { rows, total, counts, totals, status, page, pageSize, links } = data;

  const tabHref = (k: string) => {
    const kept = keepParams(searchParams, ["q", "link", "period", "from", "to"]);
    if (k !== "all") kept.status = k;
    return `${BASE}${toQs(kept)}`;
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

  const exportParams = keepParams(searchParams, ["q", "status", "link", "period", "from", "to"]);

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
          <Button variant="outline" onClick={() => void download("/finance/invoices/export.csv", exportParams)}>
            <Download className="size-4" /> <span className="hidden sm:inline">{tc("actions.exportCsv")}</span>
          </Button>
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

import { useLocale, useTranslations } from "use-intl";
import { BadgeDollarSign, Calculator, Download, Eye, Paperclip, Trash2 } from "lucide-react";
import type { expensesPage } from "@api/modules/finance/routes";
import type { ExpenseRow } from "@api/modules/finance/expenses";
import { EXPENSE_CATEGORIES, formatDate } from "@onet/shared";
import { assetUrl, download } from "@/lib/api";
import { useApi } from "@/lib/query";
import { useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { deleteExpense } from "@/api/finance";
import { QueryView } from "@/components/states/page-state";
import { keepParams } from "@/components/finance/params";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { FilterChips, FilterSelect, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { Amount, AmountBars, EXPENSE_COLORS, LinkChip } from "@/components/finance/finance-ui";
import { ExpenseDialog } from "@/components/finance/expense-dialog";
import { PeriodFilter } from "@/components/finance/period-filter";

const BASE = "/dashboard/finance/expenses";
type SP = Record<string, string | undefined>;
type Data = Loaded<typeof expensesPage>;

/** Only the editable fields are sent to the client dialog. */
const editable = (e: ExpenseRow) => ({ id: e.id, category: e.category, amount: e.amount, date: e.date, description: e.description, supplier: e.supplier, attachmentUrl: e.attachmentUrl, eventId: e.eventId, tripId: e.tripId });

/** /dashboard/finance/expenses (finance staff; managers can create/edit/delete). */
export function Component() {
  const sp = useSearchParamsObject();
  const query = useApi<Data>("/finance/expenses", sp);
  return <QueryView query={query}>{(data) => <ExpensesPage data={data} sp={sp} />}</QueryView>;
}

function ExpensesPage({ data, sp }: { data: Data; sp: SP }) {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const locale = useLocale();
  usePageTitle(t("titles.expenses"));
  const { rows, total, categories, sum, page, pageSize, links, formLinks, manage } = data;
  const exportParams = keepParams(sp, ["q", "category", "link", "period", "from", "to"]);
  const count = categories.reduce((s, c) => s + c.count, 0);
  const catLabel = (c: string) => tc(`enums.expenseCategory.${c}`);

  const columns: Column<ExpenseRow>[] = [
    {
      key: "description",
      header: t("columns.description"),
      cell: (e) => (
        <span className="block min-w-0">
          <span className="block max-w-md truncate font-bold text-ink">{e.description}</span>
          <span className="flex min-w-0 items-center gap-2 text-xs text-muted">
            <span className="truncate">{e.supplier ?? "—"}</span>
            {(e.event || e.trip) && <LinkChip event={e.event} trip={e.trip} />}
          </span>
        </span>
      ),
    },
    { key: "category", header: t("columns.category"), cell: (e) => <Badge color={EXPENSE_COLORS[e.category]}>{catLabel(e.category)}</Badge> },
    { key: "date", header: t("columns.date"), hideBelow: "lg", cell: (e) => <span className="text-sm whitespace-nowrap text-ink-2">{formatDate(e.date, locale)}</span> },
    { key: "amount", header: t("columns.amount"), align: "end", cell: (e) => <Amount value={e.amount} className="font-bold text-ink" /> },
    {
      key: "actions",
      header: <span className="sr-only">{tc("fields.actions")}</span>,
      align: "end",
      cell: (e) => (
        <span className="inline-flex items-center gap-0.5">
          {e.attachmentUrl && (
            <a href={assetUrl(e.attachmentUrl)} target="_blank" rel="noopener" className={buttonClasses("ghost", "icon-sm")} aria-label={t("expenses.viewFile")} title={t("expenses.viewFile")}>
              <Paperclip className="size-4" />
            </a>
          )}
          {manage && <ExpenseDialog initial={editable(e)} events={formLinks.events} trips={formLinks.trips} />}
          {manage && (
            <ConfirmButton action={deleteExpense.bind(null, e.id)} title={t("confirm.deleteExpenseTitle")} ariaLabel={tc("actions.delete")} size="icon-sm">
              <Trash2 className="size-4 text-red-600" />
            </ConfirmButton>
          )}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        icon={<BadgeDollarSign className="size-6" />}
        title={t("titles.expenses")}
        description={t("descriptions.expenses")}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.expenses") }]}
        actions={
          <>
            {!manage && (
              <Badge tone="neutral">
                <Eye className="size-3.5" /> {t("readOnly")}
              </Badge>
            )}
            <Button variant="outline" onClick={() => void download("/finance/expenses/export.csv", exportParams)}>
              <Download className="size-4" /> {tc("actions.exportCsv")}
            </Button>
            {manage && <ExpenseDialog events={formLinks.events} trips={formLinks.trips} />}
          </>
        }
      />

      <PeriodFilter className="mb-4" />

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <KpiCard accent="coral" icon={<BadgeDollarSign className="size-5" />} label={t("expenses.total")} value={<Amount value={sum} />} hint={t("expenses.count", { count })} />
          <KpiCard
            accent="grape"
            icon={<Calculator className="size-5" />}
            label={t("expenses.average")}
            value={<Amount value={count ? Math.round(sum / count / 1000) * 1000 : 0} />}
            hint={categories[0] ? `${t("expenses.biggest")} : ${catLabel(categories[0].category)}` : undefined}
          />
        </div>
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold text-ink">{t("expenses.byCategory")}</h2>
          {categories.length ? (
            <AmountBars items={categories.map((c) => ({ key: c.category, label: catLabel(c.category), amount: c.amount, color: EXPENSE_COLORS[c.category] ?? "#7a7390", hint: `×${c.count}` }))} total={sum} />
          ) : (
            <p className="text-sm text-muted">{t("expenses.empty")}</p>
          )}
        </section>
      </div>

      <FilterChips param="category" allLabel={t("filters.allCategories")} options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: catLabel(c), color: EXPENSE_COLORS[c] }))} className="mb-3" />
      <Toolbar>
        <SearchBox placeholder={t("filters.searchExpenses")} />
        <FilterSelect
          param="link"
          allLabel={t("filters.allLinks")}
          options={[...links.events.map((e) => ({ value: `event:${e.id}`, label: `${t("invoice.event")} · ${e.title}` })), ...links.trips.map((x) => ({ value: `trip:${x.id}`, label: `${t("invoice.trip")} · ${x.title}` }))]}
          className="sm:max-w-64"
        />
      </Toolbar>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(e) => e.id}
        mobileCard={(e) => (
          <div className="flex items-start gap-3">
            <span className="mt-1 size-3 shrink-0 rounded-full" style={{ background: EXPENSE_COLORS[e.category] }} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-ink">{e.description}</p>
              <p className="truncate text-xs text-muted">
                {catLabel(e.category)} · {formatDate(e.date, locale)}
                {e.supplier && ` · ${e.supplier}`}
              </p>
              {(e.event || e.trip) && (
                <div className="mt-1.5">
                  <LinkChip event={e.event} trip={e.trip} />
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <Amount value={e.amount} className="font-display text-lg font-extrabold text-ink" />
              <span className="flex items-center">
                {e.attachmentUrl && (
                  <a href={assetUrl(e.attachmentUrl)} target="_blank" rel="noopener" className={buttonClasses("ghost", "icon-sm")} aria-label={t("expenses.viewFile")}>
                    <Paperclip className="size-4" />
                  </a>
                )}
                {manage && <ExpenseDialog initial={editable(e)} events={formLinks.events} trips={formLinks.trips} />}
                {manage && (
                  <ConfirmButton action={deleteExpense.bind(null, e.id)} title={t("confirm.deleteExpenseTitle")} ariaLabel={tc("actions.delete")} size="icon-sm">
                    <Trash2 className="size-4 text-red-600" />
                  </ConfirmButton>
                )}
              </span>
            </div>
          </div>
        )}
        empty={
          <div className="card">
            <EmptyState title={t("expenses.empty")} description={t("expenses.emptyHint")} action={manage ? <ExpenseDialog events={formLinks.events} trips={formLinks.trips} /> : undefined} />
          </div>
        }
      />
      <Pagination page={page} pageSize={pageSize} total={total} basePath={BASE} searchParams={sp} />
    </>
  );
}

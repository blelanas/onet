import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AlertCircle, ClipboardCheck, FileCheck2, FileSignature, Hourglass, Users } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { REGISTRATION_STATUSES } from "@/lib/constants";
import { paymentState, targetOptions, type RegistrationRow } from "@/server/registrations/queries";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { Pagination, paging } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterSelect, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { BULK_FORM_ID, BulkBar } from "./bulk-bar";
import { RegistrationQuickActions } from "./quick-actions";
import { CategoryIcon, categoryColor } from "./visuals";

type SP = Record<string, string | string[] | undefined>;

/** Staff console: every event and trip registration with filters and quick/bulk actions. */
export async function StaffRegistrations({ rows, searchParams }: { rows: RegistrationRow[]; searchParams: SP }) {
  const t = await getTranslations("events");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const { page, pageSize, skip, take } = paging(searchParams, 20);
  const pageRows = rows.slice(skip, skip + take);
  const targets = await targetOptions();
  const live = rows.filter((r) => r.status !== "CANCELLED");
  const unpaid = live.filter((r) => paymentState(r.invoice) === "UNPAID");

  const check = (r: RegistrationRow) =>
    r.status !== "CANCELLED" ? <input type="checkbox" form={BULK_FORM_ID} name="ids[]" value={`${r.kind}:${r.id}`} className="size-4 cursor-pointer accent-brand-600" aria-label={`${r.member.firstName} ${r.member.lastName}`} /> : <span className="inline-block size-4" />;

  const targetCell = (r: RegistrationRow) => (
    <Link href={`/dashboard/${r.kind === "event" ? "events" : "trips"}/${r.target.id}`} className="flex max-w-72 min-w-0 items-center gap-2.5 hover:text-brand-700">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl text-white [&_svg]:size-4" style={{ background: categoryColor(r.target.category) }}>
        <CategoryIcon kind={r.kind} category={r.target.category} />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-bold text-ink">{r.target.title}</span>
        <span className="block text-xs text-muted">
          {t(`registrations.kind.${r.kind}`)} · {formatDate(r.target.date, locale)} · <span title={t("registrations.registeredAt")}>{t("registrations.registeredShort", { date: formatDate(r.createdAt, locale, "short") })}</span>
        </span>
      </span>
    </Link>
  );

  const payCell = (r: RegistrationRow) =>
    r.invoice ? (
      <Link href={`/dashboard/finance/invoices/${r.invoice.id}`} className="flex flex-col items-start gap-0.5">
        <StatusBadge status={r.invoice.status} />
        <span className="text-xs text-muted tabular-nums">{formatMoney(r.invoice.amount, locale)}</span>
      </Link>
    ) : (
      <Badge tone="teal">{tc("fields.free")}</Badge>
    );

  const columns: Column<RegistrationRow>[] = [
    { key: "check", header: <span className="sr-only">{t("bulk.selectAll")}</span>, className: "w-8", cell: check },
    {
      key: "member",
      header: t("participants.member"),
      cell: (r) => (
        <Link href={`/dashboard/members/${r.member.id}`} className="flex items-center gap-2.5 hover:text-brand-700">
          <Avatar firstName={r.member.firstName} lastName={r.member.lastName} src={r.member.photoUrl} size="sm" />
          <span className="font-bold whitespace-nowrap text-ink">
            {r.member.firstName} {r.member.lastName}
          </span>
        </Link>
      ),
    },
    { key: "target", header: t("registrations.target"), cell: targetCell },
    {
      key: "status",
      header: tc("fields.status"),
      cell: (r) => (
        <span className="flex flex-col items-start gap-1">
          <StatusBadge status={r.status} />
          {r.kind === "trip" && r.status !== "CANCELLED" && (
            <span className="flex gap-1" title={`${t(r.parentConsent ? "registrations.consentOk" : "registrations.consentMissing")} · ${t("registrations.docs")} : ${r.documentsStatus ? tc(`status.${r.documentsStatus}`) : "—"}`}>
              <Badge tone={r.parentConsent ? "success" : "danger"}>
                <FileSignature className="size-3" />
              </Badge>
              {r.documentsStatus && (
                <Badge tone={r.documentsStatus === "COMPLETE" ? "success" : r.documentsStatus === "PARTIAL" ? "warning" : "danger"}>
                  <FileCheck2 className="size-3" /> {tc(`status.${r.documentsStatus}`)}
                </Badge>
              )}
            </span>
          )}
        </span>
      ),
    },
    { key: "payment", header: t("participants.payment"), cell: payCell },
    { key: "actions", header: <span className="sr-only">{tc("fields.actions")}</span>, align: "end", cell: (r) => <RegistrationQuickActions kind={r.kind} id={r.id} status={r.status} /> },
  ];

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label={t("registrations.kpi.active")} value={live.length} icon={<Users className="size-5" />} accent="sky" />
        <KpiCard label={tc("status.PENDING")} value={live.filter((r) => r.status === "PENDING").length} icon={<Hourglass className="size-5" />} accent="sun" />
        <KpiCard label={tc("status.WAITLIST")} value={live.filter((r) => r.status === "WAITLIST").length} icon={<ClipboardCheck className="size-5" />} accent="grape" />
        <KpiCard label={t("registrations.kpi.unpaid")} value={unpaid.length} icon={<AlertCircle className="size-5" />} accent="brand" hint={formatMoney(unpaid.reduce((s, r) => s + (r.invoice?.amount ?? 0), 0), locale)} />
      </div>
      <Toolbar>
        <SearchBox placeholder={t("registrations.searchPlaceholder")} className="sm:min-w-60" />
        <FilterSelect param="kind" allLabel={t("registrations.filters.allKinds")} options={[{ value: "event", label: t("registrations.kind.event") }, { value: "trip", label: t("registrations.kind.trip") }]} />
        <FilterSelect param="status" allLabel={t("registrations.filters.allStatuses")} options={REGISTRATION_STATUSES.map((s) => ({ value: s, label: tc(`status.${s}`) }))} />
        <FilterSelect param="payment" allLabel={t("registrations.filters.allPayments")} options={["PAID", "UNPAID", "FREE"].map((s) => ({ value: s, label: t(`registrations.payment.${s}`) }))} />
        <FilterSelect
          param="target"
          className="max-w-full sm:max-w-64"
          allLabel={t("registrations.filters.allTargets")}
          options={[...targets.trips.map((x) => ({ value: `trip:${x.id}`, label: `🚌 ${x.title}` })), ...targets.events.map((x) => ({ value: `event:${x.id}`, label: `🎉 ${x.title}` }))]}
        />
      </Toolbar>
      {rows.length > 0 && <BulkBar />}
      <DataTable
        className="min-w-0 overflow-x-auto"
        rows={pageRows}
        columns={columns}
        rowKey={(r) => `${r.kind}:${r.id}`}
        mobileCard={(r) => (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="pt-1">{check(r)}</span>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar firstName={r.member.firstName} lastName={r.member.lastName} src={r.member.photoUrl} size="sm" />
                    <span className="truncate font-bold text-ink">
                      {r.member.firstName} {r.member.lastName}
                    </span>
                  </span>
                  <StatusBadge status={r.status} />
                </div>
                {targetCell(r)}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-dashed border-line pt-2">
              {payCell(r)}
              <RegistrationQuickActions kind={r.kind} id={r.id} status={r.status} />
            </div>
          </div>
        )}
        empty={
          <div className="card">
            <EmptyState title={tc("states.noResults")} description={tc("states.noResultsHint")} />
          </div>
        }
      />
      <Pagination page={page} pageSize={pageSize} total={rows.length} basePath="/dashboard/registrations" searchParams={searchParams} />
    </>
  );
}

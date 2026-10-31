import { useLocale, useTranslations } from "use-intl";
import { ArrowLeft, Download, Printer } from "lucide-react";
import type { tripReportPage } from "@api/modules/trips/routes";
import { formatDate, formatDateTime, formatMoney } from "@onet/shared";
import { download } from "@/lib/api";
import { useApi } from "@/lib/query";
import { useParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RequirePerm } from "@/components/states/guards";
import { QueryView } from "@/components/states/page-state";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Breadcrumbs } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";

type Data = Loaded<typeof tripReportPage>;
type Row = Data["participants"][number];

/** Print rules: only the report sheet is printed (A4 landscape so the whole table fits). */
const PRINT_CSS = `
@media print {
  @page { size: A4 landscape; margin: 10mm; }
  html, body { background: #fff !important; }
  body * { visibility: hidden !important; }
  .trip-report-print, .trip-report-print * { visibility: visible !important; }
  .trip-report-print { position: absolute !important; inset: 0 0 auto 0 !important; margin: 0 !important; border: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
  .trip-report-print .print-color { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* Compact table so every column fits the sheet; rows never split across pages. */
  .trip-report-print .overflow-hidden { overflow: visible !important; }
  .trip-report-print table, .trip-report-print table * { font-size: 9.5px !important; line-height: 1.3 !important; }
  .trip-report-print th, .trip-report-print td { padding: 4px 6px !important; }
  .trip-report-print tr { break-inside: avoid; }
  .trip-report-print h2 { break-after: avoid; }
  .trip-report-print thead { display: table-header-group; }
  .no-print { display: none !important; }
}`;

/** /dashboard/trips/:id/report — the report accountants receive when a manager finalizes the list. */
export function Component() {
  const { id } = useParams();
  const query = useApi<Data>(`/trips/${id}/report`);
  return (
    <RequirePerm any={["trips.read", "finance.read"]}>
      <QueryView query={query}>{(data) => <TripReport id={id!} data={data} />}</QueryView>
    </RequirePerm>
  );
}

function TripReport({ id, data }: { id: string; data: Data }) {
  const t = useTranslations("trips.report");
  const tm = useTranslations("trips.manage");
  const tt = useTranslations("trips");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const { trip, managers, finalized, participants, refunds, totals, generatedAt, org } = data;
  usePageTitle(`${t("title")} — ${trip.title}`);
  const money = (v: number) => formatMoney(v, locale);
  const sameDay = formatDate(trip.departAt, locale) === formatDate(trip.returnAt, locale);

  const columns: Column<Row>[] = [
    { key: "n", header: "#", cell: (r) => <span className="text-muted tabular-nums">{participants.indexOf(r) + 1}</span>, className: "w-8" },
    {
      key: "name",
      header: tm("columns.participant"),
      cell: (r) => (
        <span className="block min-w-0">
          <span className="block font-bold text-ink">
            {r.member.firstName} {r.member.lastName}
          </span>
          <span className="block text-xs text-muted" dir="ltr">
            {r.member.membershipNumber}
          </span>
        </span>
      ),
    },
    { key: "type", header: tm("columns.type"), cell: (r) => <Badge tone={r.type === "kid" ? "warning" : "violet"}>{tm(`types.${r.type}`)}</Badge> },
    { key: "age", header: tm("columns.age"), cell: (r) => (r.age != null ? <span className="tabular-nums">{r.age}</span> : "—") },
    {
      key: "phone",
      header: tm("columns.phone"),
      cell: (r) =>
        r.phone ? (
          <a href={`tel:${r.phone}`} className="whitespace-nowrap text-brand-700" dir="ltr">
            {r.phone}
          </a>
        ) : (
          "—"
        ),
    },
    { key: "guardian", header: t("csv.guardian"), cell: (r) => r.guardian?.name ?? "—" },
    { key: "due", header: tm("columns.due"), align: "end", cell: (r) => <span className="whitespace-nowrap tabular-nums">{r.invoice ? money(r.amountDue) : tm("free")}</span> },
    { key: "paid", header: tm("columns.paid"), align: "end", cell: (r) => <span className="font-semibold whitespace-nowrap text-emerald-700 tabular-nums">{money(r.paid)}</span> },
    {
      key: "remaining",
      header: tm("columns.remaining"),
      align: "end",
      cell: (r) => <span className={cn("font-extrabold whitespace-nowrap tabular-nums", r.remaining ? "text-amber-700" : "text-emerald-700")}>{money(r.remaining)}</span>,
    },
    { key: "methods", header: t("csv.methods"), cell: (r) => (r.methods.length ? r.methods.map((m) => tc(`enums.paymentMethod.${m}`)).join(" + ") : "—") },
    { key: "status", header: tm("columns.status"), cell: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-5">
      <style>{PRINT_CSS}</style>
      <div className="no-print space-y-3">
        <Breadcrumbs items={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: tt("titles.trips"), href: "/dashboard/trips" }, { label: trip.title, href: `/dashboard/trips/${id}` }, { label: t("title") }]} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <LinkButton href={`/dashboard/trips/${id}?tab=participants`} variant="ghost" size="sm">
            <ArrowLeft className="rtl-flip size-4" /> {t("back")}
          </LinkButton>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void download(`/trips/${id}/report.csv`)}>
              <Download className="size-4" /> {t("exportCsv")}
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="size-4" /> {t("print")}
            </Button>
          </div>
        </div>
      </div>

      <article className="trip-report-print card relative overflow-hidden bg-white">
        <div className="print-color h-2 bg-gradient-to-r from-brand-600 via-sun to-sky" aria-hidden />
        <div className="space-y-6 p-4 sm:p-8 print:space-y-4 print:p-0 print:pt-3">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <img src="/brand/onet-mark.svg" alt="" className="size-12 shrink-0" />
              <div className="min-w-0 text-sm">
                <p className="font-display text-lg font-extrabold text-ink">{org?.name ?? "ONET Teboulba"}</p>
                {locale === "ar" && org?.fullNameAr ? <p className="text-ink-2">{org.fullNameAr}</p> : org?.fullName && <p className="max-w-sm text-ink-2">{org.fullName}</p>}
              </div>
            </div>
            <div className="sm:text-end">
              <p className="text-xs font-extrabold tracking-[0.2em] text-brand-600 uppercase">{t("title")}</p>
              <h1 className="font-display text-2xl leading-tight font-extrabold text-ink">{trip.title}</h1>
              <p className={cn("mt-1 text-sm font-semibold", finalized ? "text-emerald-700" : "text-amber-700")}>
                {finalized ? t("finalized", { date: formatDateTime(finalized.at, locale), name: finalized.by ?? "—" }) : t("notFinalized")}
              </p>
            </div>
          </header>

          <dl className="grid gap-3 rounded-2xl border border-line p-4 text-sm sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:p-3">
            <Info label={t("destination")} value={trip.destination} />
            <Info label={t("dates")} value={sameDay ? formatDate(trip.departAt, locale, "long") : `${formatDate(trip.departAt, locale)} → ${formatDate(trip.returnAt, locale)}`} />
            <Info label={t("meeting")} value={trip.departureLocation} />
            <Info label={t("price")} value={trip.price > 0 ? money(trip.price) : tm("free")} />
            <div className="sm:col-span-2 lg:col-span-4 print:col-span-4">
              <dt className="text-xs font-bold text-muted">{t("managers")}</dt>
              <dd className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 font-semibold text-ink">
                {managers.length
                  ? managers.map((m) => (
                      <span key={m.memberId}>
                        {m.name}
                        {m.phone && (
                          <span className="ms-1 text-muted" dir="ltr">
                            ({m.phone})
                          </span>
                        )}
                      </span>
                    ))
                  : "—"}
              </dd>
            </div>
          </dl>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 print:grid-cols-4">
            <Total label={tm("kpi.participants")} value={String(totals.participants)} hint={totals.waitlist ? t("waitlist", { count: totals.waitlist }) : undefined} />
            <Total label={tm("kpi.expected")} value={money(totals.expected)} />
            <Total label={tm("kpi.collected")} value={money(totals.collected)} tone="text-emerald-700" />
            <Total label={tm("kpi.outstanding")} value={money(totals.outstanding)} tone={totals.outstanding ? "text-amber-700" : "text-emerald-700"} />
          </section>

          <section className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-bold text-ink-2">{t("byMethod")}</span>
            {totals.byMethod.length ? (
              totals.byMethod.map((m) => (
                <span key={m.method} className="print-color rounded-full bg-surface-2 px-3 py-1 font-semibold text-ink">
                  {tc(`enums.paymentMethod.${m.method}`)} · <span className="tabular-nums">{money(m.amount)}</span>
                </span>
              ))
            ) : (
              <span className="text-muted">{t("noPayments")}</span>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-ink">
              {t("document")} <span className="text-muted">({participants.length})</span>
            </h2>
            <DataTable
              rows={participants}
              columns={columns}
              rowKey={(r) => r.id}
              mobileCard={(r) => (
                <div className="space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 font-bold text-ink">
                      {participants.indexOf(r) + 1}. {r.member.firstName} {r.member.lastName}
                    </p>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-xs text-muted">
                    {[tm(`types.${r.type}`), r.age != null && tm("years", { count: r.age }), r.guardian && tm("guardian", { name: r.guardian.name })].filter(Boolean).join(" · ")}
                  </p>
                  {r.phone && (
                    <a href={`tel:${r.phone}`} className="block text-xs font-semibold text-brand-700" dir="ltr">
                      {r.phone}
                    </a>
                  )}
                  <p className="grid grid-cols-3 gap-2 text-xs tabular-nums">
                    <span>
                      <span className="block text-muted">{tm("columns.due")}</span>
                      {money(r.amountDue)}
                    </span>
                    <span>
                      <span className="block text-muted">{tm("columns.paid")}</span>
                      <span className="text-emerald-700">{money(r.paid)}</span>
                    </span>
                    <span>
                      <span className="block text-muted">{tm("columns.remaining")}</span>
                      <span className={r.remaining ? "font-bold text-amber-700" : "text-emerald-700"}>{money(r.remaining)}</span>
                    </span>
                  </p>
                </div>
              )}
              empty={<p className="rounded-2xl bg-surface-2 p-6 text-center text-sm text-muted">{t("empty")}</p>}
            />
          </section>

          {refunds.length > 0 && (
            <section className="space-y-2 rounded-2xl border border-amber-200 bg-sun-soft/60 p-4">
              <h2 className="text-sm font-extrabold text-amber-800">{t("refunds")}</h2>
              <p className="text-xs text-amber-800">{t("refundsHint")}</p>
              <ul className="space-y-1 text-sm">
                {refunds.map((r) => (
                  <li key={r.id} className="flex justify-between gap-3">
                    <span>
                      {r.member.firstName} {r.member.lastName}
                    </span>
                    <span className="font-bold tabular-nums">{money(r.paid)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <footer className="flex flex-col gap-4 border-t border-line pt-4 text-xs text-muted sm:flex-row sm:items-end sm:justify-between">
            <p>{t("generated", { date: formatDateTime(generatedAt, locale) })}</p>
            <div className="h-20 w-full rounded-xl border border-dashed border-line p-2 sm:w-64">
              <p className="font-bold text-ink-2">{t("signature")}</p>
            </div>
          </footer>
        </div>
      </article>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold break-words text-ink">{value}</dd>
    </div>
  );
}

function Total({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="print-color rounded-2xl bg-surface-2 p-3 sm:p-4">
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className={cn("mt-1 font-display text-lg font-extrabold break-words text-ink tabular-nums sm:text-2xl", tone)}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

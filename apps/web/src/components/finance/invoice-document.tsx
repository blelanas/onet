import { useLocale, useTranslations } from "use-intl";
import { formatDate } from "@onet/shared";
import { cn } from "@/lib/utils";
import type { InvoiceDetail, OrgProfile } from "@api/modules/finance/queries";
import { StatusBadge } from "@/components/ui/status-badge";
import { Amount } from "./finance-ui";

/** Print rules: only the invoice document is printed, app chrome and side panels are hidden. */
const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 12mm; }
  html, body { background: #fff !important; }
  body * { visibility: hidden !important; }
  .invoice-print, .invoice-print * { visibility: visible !important; }
  .invoice-print { position: absolute !important; inset: 0 0 auto 0 !important; margin: 0 !important; border: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
  .no-print { display: none !important; }
  .invoice-print .print-color { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

/** The printable invoice (A4-like sheet). */
export function InvoiceDocument({ inv, org }: { inv: InvoiceDetail; org: OrgProfile | null }) {
  const t = useTranslations("finance.invoice");
  const locale = useLocale();
  const stamp = inv.status === "PAID" ? { text: t("stampPaid"), cls: "border-emerald-600 text-emerald-600" } : inv.status === "CANCELLED" ? { text: t("stampCancelled"), cls: "border-red-600 text-red-600" } : null;
  const concerning = inv.event ? `${t("event")} · ${inv.event.title}` : inv.trip ? `${t("trip")} · ${inv.trip.title}` : inv.activity ? `${t("activity")} · ${inv.activity.title}` : null;

  return (
    <article className="invoice-print card relative overflow-hidden bg-white">
      <style>{PRINT_CSS}</style>
      <div className="print-color h-2 bg-gradient-to-r from-brand-600 via-sun to-sky" aria-hidden />
      {stamp && (
        <div className="pointer-events-none absolute end-6 top-28 rotate-[-14deg] sm:end-12 sm:top-24" aria-hidden>
          <span className={cn("block rounded-xl border-4 px-4 py-1 font-display text-2xl font-black tracking-widest opacity-70 sm:text-3xl", stamp.cls)}>{stamp.text}</span>
        </div>
      )}
      <div className="space-y-7 p-5 sm:p-9">
        {/* Header */}
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <img src="/brand/onet-mark.svg" alt="" className="size-14 shrink-0" />
            <div className="min-w-0 text-sm">
              <p className="font-display text-lg font-extrabold text-ink">{org?.name ?? "ONET Teboulba"}</p>
              {locale === "ar" && org?.fullNameAr ? <p className="text-ink-2">{org.fullNameAr}</p> : org?.fullName && <p className="max-w-xs text-ink-2">{org.fullName}</p>}
              {org?.address && <p className="max-w-xs text-muted">{org.address}</p>}
              <p className="text-muted">
                {org?.phone && <span dir="ltr">{org.phone}</span>}
                {org?.phone && org?.email && " · "}
                {org?.email}
              </p>
            </div>
          </div>
          <div className="sm:text-end">
            <p className="text-xs font-extrabold tracking-[0.2em] text-brand-600 uppercase">{t("document")}</p>
            <p className="font-display text-2xl font-extrabold whitespace-nowrap text-ink tabular-nums" dir="ltr">
              {inv.number}
            </p>
            <div className="mt-1.5">
              <StatusBadge status={inv.status} />
            </div>
          </div>
        </header>

        {/* Parties & dates */}
        <div className="grid gap-4 rounded-2xl bg-surface-2/70 p-4 text-sm sm:grid-cols-3 sm:p-5">
          <div>
            <p className="text-xs font-extrabold tracking-wide text-muted uppercase">{t("billTo")}</p>
            <p className="mt-1 font-bold text-ink">
              {inv.payer.firstName} {inv.payer.lastName}
            </p>
            <p className="text-xs text-muted" dir="auto">
              {t("member", { number: inv.payer.membershipNumber })}
            </p>
            {inv.payer.address && <p className="text-ink-2">{inv.payer.address}</p>}
            {inv.payer.phone && (
              <p className="text-ink-2" dir="ltr">
                {inv.payer.phone}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-extrabold tracking-wide text-muted uppercase">{t("concerning")}</p>
            {inv.child ? (
              <p className="mt-1 font-bold text-ink">
                {inv.child.firstName} {inv.child.lastName}
              </p>
            ) : (
              <p className="mt-1 text-muted">—</p>
            )}
            {inv.child?.group && <p className="text-ink-2">{inv.child.group.name}</p>}
            {concerning && <p className="text-ink-2">{concerning}</p>}
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-1">
            <div>
              <dt className="text-xs font-extrabold tracking-wide text-muted uppercase">{t("issuedOn")}</dt>
              <dd className="font-bold text-ink">{formatDate(inv.issuedAt, locale)}</dd>
            </div>
            <div>
              <dt className="text-xs font-extrabold tracking-wide text-muted uppercase">{t("dueOn")}</dt>
              <dd className={cn("font-bold", inv.status === "OVERDUE" ? "text-red-600" : "text-ink")}>{formatDate(inv.dueDate, locale)}</dd>
            </div>
            {inv.paidAt && inv.status === "PAID" && (
              <div>
                <dt className="text-xs font-extrabold tracking-wide text-muted uppercase">{t("paidOn")}</dt>
                <dd className="font-bold text-emerald-700">{formatDate(inv.paidAt, locale)}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Lines */}
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="print-color bg-ink text-white">
              <tr>
                <th className="px-4 py-2.5 text-start font-bold">{t("line")}</th>
                <th className="hidden px-4 py-2.5 text-center font-bold sm:table-cell">{t("qty")}</th>
                <th className="hidden px-4 py-2.5 text-end font-bold sm:table-cell">{t("unitPrice")}</th>
                <th className="px-4 py-2.5 text-end font-bold">{t("total")}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-4 align-top">
                  <p className="font-bold text-ink">{inv.description}</p>
                  {concerning && <p className="text-xs text-muted">{concerning}</p>}
                </td>
                <td className="hidden px-4 py-4 text-center align-top tabular-nums sm:table-cell">1</td>
                <td className="hidden px-4 py-4 text-end align-top sm:table-cell">
                  <Amount value={inv.amount} />
                </td>
                <td className="px-4 py-4 text-end align-top font-bold">
                  <Amount value={inv.amount} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm text-sm">
            {inv.notes && (
              <>
                <p className="text-xs font-extrabold tracking-wide text-muted uppercase">{t("notes")}</p>
                <p className="mt-1 whitespace-pre-line text-ink-2">{inv.notes}</p>
              </>
            )}
          </div>
          <dl className="w-full space-y-2 text-sm sm:w-72">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t("totalDue")}</dt>
              <dd className="font-bold text-ink">
                <Amount value={inv.amount} />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t("alreadyPaid")}</dt>
              <dd className="font-bold text-emerald-700">
                <Amount value={inv.paid} />
              </dd>
            </div>
            <div className="print-color flex items-center justify-between gap-3 rounded-xl bg-brand-50 px-3 py-2.5">
              <dt className="font-extrabold text-brand-800">{t("balance")}</dt>
              <dd className="font-display text-xl font-extrabold text-brand-700">
                <Amount value={inv.status === "CANCELLED" ? 0 : inv.remaining} />
              </dd>
            </div>
          </dl>
        </div>

        <footer className="border-t border-dashed border-line pt-4 text-center text-xs text-muted">{t("thanks")}</footer>
      </div>
    </article>
  );
}

import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Ban, CalendarCheck2, Edit, FilePen, Landmark, RotateCcw, Send, Undo2 } from "lucide-react";
import { pageQuery } from "@/lib/auth/guards";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { canManageFinance, requireFinancePage } from "@/server/finance/access";
import { bankInfo, getInvoice, orgProfile } from "@/server/finance/queries";
import { cancelInvoice, refundPayment, setInvoiceStatus } from "@/server/finance/actions";
import { LinkButton } from "@/components/ui/button";
import { ActionButton, ConfirmButton } from "@/components/ui/confirm-button";
import { Breadcrumbs } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import { Amount, MethodBadge } from "@/components/finance/finance-ui";
import { InvoiceDocument } from "@/components/finance/invoice-document";
import { PrintButton, RecordPaymentButton } from "@/components/finance/invoice-actions";
import { PayOnlineButton } from "@/components/finance/pay-online-button";

export async function generateMetadata() {
  const t = await getTranslations("finance.titles");
  return { title: t("invoices") };
}

const OPEN = ["PENDING", "PARTIALLY_PAID", "OVERDUE"];

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { user, mode } = await requireFinancePage();
  const { id } = await params;
  const inv = await pageQuery(getInvoice(user, id));
  const [org, bank] = await Promise.all([orgProfile(), bankInfo()]);
  const t = await getTranslations("finance");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const locale = await getLocale();
  const manage = canManageFinance(user);
  const family = mode === "family";
  const open = OPEN.includes(inv.status);
  const percent = inv.amount ? Math.min(100, Math.round((inv.paid / inv.amount) * 100)) : 0;
  const hasStatusActions = inv.status === "DRAFT" || inv.status === "CANCELLED" || inv.paid === 0;
  const registration = inv.tripRegistration ?? inv.eventRegistration;
  const regHref = inv.trip ? `/dashboard/trips/${inv.trip.id}` : inv.event ? `/dashboard/events/${inv.event.id}` : null;

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Breadcrumbs items={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: family ? t("titles.myInvoices") : t("titles.invoices"), href: "/dashboard/finance/invoices" }, { label: inv.number }]} />
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold text-ink sm:text-3xl" dir="ltr">
              {inv.number}
            </h1>
            <StatusBadge status={inv.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrintButton />
          {manage && inv.paid === 0 && inv.status !== "CANCELLED" && (
            <LinkButton href={`/dashboard/finance/invoices/${inv.id}/edit`} variant="outline">
              <Edit className="size-4" /> {tc("actions.edit")}
            </LinkButton>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <InvoiceDocument inv={inv} org={org} />

          <Section title={t("invoice.paymentsHistory")} className="no-print">
            {inv.payments.length ? (
              <ul className="divide-y divide-line">
                {inv.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Amount value={p.amount} className={p.status === "COMPLETED" ? "font-display text-lg font-extrabold text-ink" : "font-display text-lg font-extrabold text-muted line-through"} />
                        <MethodBadge method={p.method} />
                        {p.status !== "COMPLETED" && <StatusBadge status={p.status} />}
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatDateTime(p.paidAt, locale)}
                        {p.reference && (
                          <>
                            {" · "}
                            <span dir="ltr">{p.reference}</span>
                          </>
                        )}
                        {!family && p.recordedBy && ` · ${p.recordedBy.name}`}
                      </p>
                      {p.notes && !family && <p className="mt-0.5 text-xs text-ink-2">{p.notes}</p>}
                    </div>
                    {manage && p.status === "COMPLETED" && (
                      <ConfirmButton
                        action={refundPayment.bind(null, p.id)}
                        title={t("confirm.refundTitle")}
                        description={t("confirm.refundText", { amount: formatMoney(p.amount, locale) })}
                        successMessage={t("toast.refunded")}
                        confirmLabel={t("actions.refund")}
                      >
                        <Undo2 className="size-4" /> {t("actions.refund")}
                      </ConfirmButton>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t("invoice.noPayments")}</p>
            )}
          </Section>
        </div>

        <aside className="no-print order-first space-y-5 lg:order-none">
          {/* Balance + main action */}
          <section className="card space-y-4 p-5">
            <div>
              <p className="text-sm font-bold text-muted">{t("invoice.balance")}</p>
              <Amount value={inv.status === "CANCELLED" ? 0 : inv.remaining} className="font-display text-3xl font-extrabold text-ink" />
              <p className="mt-1 text-xs text-muted">
                {t("invoice.alreadyPaid")} <Amount value={inv.paid} className="font-bold text-emerald-700" /> / <Amount value={inv.amount} />
              </p>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={t("invoice.progress", { percent })}>
              <div className="h-full rounded-full bg-gradient-to-r from-leaf to-teal" style={{ width: `${percent}%` }} />
            </div>
            {open && inv.remaining > 0 && family && (
              <PayOnlineButton invoiceId={inv.id} number={inv.number} description={inv.description} amountLabel={formatMoney(inv.remaining, locale)} className="w-full" />
            )}
            {open && inv.remaining > 0 && manage && <RecordPaymentButton invoiceId={inv.id} remaining={inv.remaining} remainingLabel={formatMoney(inv.remaining, locale)} className="w-full" />}
            {manage && hasStatusActions && (
              <div className="flex flex-col gap-2 border-t border-line pt-4">
                {inv.status === "DRAFT" && (
                  <ActionButton action={setInvoiceStatus.bind(null, inv.id, "PENDING")} successMessage={t("toast.statusChanged")} variant="soft" size="md">
                    <Send className="size-4" /> {t("actions.markPending")}
                  </ActionButton>
                )}
                {inv.status === "CANCELLED" && (
                  <ActionButton action={setInvoiceStatus.bind(null, inv.id, "PENDING")} successMessage={t("toast.statusChanged")} variant="soft" size="md">
                    <RotateCcw className="size-4" /> {t("actions.reopen")}
                  </ActionButton>
                )}
                {inv.paid === 0 && (inv.status === "PENDING" || inv.status === "OVERDUE") && (
                  <ActionButton action={setInvoiceStatus.bind(null, inv.id, "DRAFT")} successMessage={t("toast.statusChanged")} variant="outline" size="md">
                    <FilePen className="size-4" /> {t("actions.markDraft")}
                  </ActionButton>
                )}
                {inv.paid === 0 && inv.status !== "CANCELLED" && (
                  <ConfirmButton action={cancelInvoice.bind(null, inv.id)} title={t("confirm.cancelTitle")} description={t("confirm.cancelText")} confirmLabel={t("actions.cancelInvoice")} successMessage={t("toast.cancelled")} variant="ghost" size="md" className="text-red-600 hover:bg-red-50 hover:text-red-700">
                    <Ban className="size-4" /> {t("actions.cancelInvoice")}
                  </ConfirmButton>
                )}
              </div>
            )}
          </section>

          {/* Bank transfer instructions (families) */}
          {family && open && bank && (
            <section className="card space-y-3 p-5">
              <h2 className="flex items-center gap-2 font-bold text-ink">
                <span className="grid size-9 place-items-center rounded-xl bg-sky-soft text-sky-700">
                  <Landmark className="size-4" />
                </span>
                {t("bank.title")}
              </h2>
              <p className="text-sm text-muted">{t("bank.intro")}</p>
              <dl className="space-y-2 rounded-2xl bg-surface-2/70 p-3 text-sm">
                {bank.bank && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">{t("bank.bank")}</dt>
                    <dd className="text-end font-bold text-ink">{bank.bank}</dd>
                  </div>
                )}
                {bank.holder && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">{t("bank.holder")}</dt>
                    <dd className="text-end font-bold text-ink">{bank.holder}</dd>
                  </div>
                )}
                {bank.rib && (
                  <div>
                    <dt className="text-muted">{t("bank.rib")}</dt>
                    <dd className="mt-0.5 font-mono text-sm font-bold tracking-wide text-ink select-all" dir="ltr">
                      {bank.rib}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted">{t("bank.reference")}</dt>
                  <dd className="mt-0.5 font-mono font-bold text-brand-700 select-all" dir="ltr">
                    {inv.number}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          {/* Linked registration */}
          {registration && regHref && (
            <section className="card space-y-2 p-5">
              <h2 className="flex items-center gap-2 font-bold text-ink">
                <span className="grid size-9 place-items-center rounded-xl bg-leaf-soft text-emerald-700">
                  <CalendarCheck2 className="size-4" />
                </span>
                {t("invoice.registration")}
              </h2>
              <Link href={regHref} className="block font-bold text-brand-700 hover:underline">
                {inv.trip?.title ?? inv.event?.title}
              </Link>
              <p className="text-xs text-muted">{formatDate(inv.trip?.departAt ?? inv.event?.startAt, locale)}</p>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={registration.status} />
                {inv.tripRegistration && <StatusBadge status={inv.tripRegistration.documentsStatus} />}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

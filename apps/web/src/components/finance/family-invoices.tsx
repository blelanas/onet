import { useLocale, useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { AlertCircle, CalendarClock, CheckCircle2, ChevronRight, PartyPopper, Receipt, Wallet } from "lucide-react";
import type { FamilyInvoice } from "@api/modules/finance/queries";
import { formatDate, formatMoney } from "@onet/shared";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Amount, LinkChip } from "./finance-ui";
import { PayOnlineButton } from "./pay-online-button";

const OPEN = ["PENDING", "PARTIALLY_PAID", "OVERDUE"];

function InvoiceCard({ inv, locale }: { inv: FamilyInvoice; locale: string }) {
  const t = useTranslations("finance");
  const open = OPEN.includes(inv.status);
  const late = inv.status === "OVERDUE" || (open && inv.dueDate < new Date());
  const percent = inv.amount ? Math.round((inv.paid / inv.amount) * 100) : 0;
  const accent = late ? "from-red-500 to-coral" : inv.status === "PAID" ? "from-leaf to-teal" : inv.status === "PARTIALLY_PAID" ? "from-sky to-teal" : "from-sun to-coral";
  return (
    <li className="card card-hover relative overflow-hidden">
      <span className={cn("absolute inset-y-0 start-0 w-1.5 bg-gradient-to-b", accent)} aria-hidden />
      <div className="space-y-3 p-4 ps-5 sm:p-5 sm:ps-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {inv.child ? (
              <Avatar firstName={inv.child.firstName} lastName={inv.child.lastName} src={inv.child.photoUrl} size="md" />
            ) : (
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-grape-soft text-violet-700">
                <Receipt className="size-5" />
              </span>
            )}
            <div className="min-w-0">
              <Link href={`/dashboard/finance/invoices/${inv.id}`} className="block truncate font-bold text-ink after:absolute after:inset-0 hover:text-brand-700">
                {inv.description}
              </Link>
              <p className="text-xs text-muted">
                {inv.child ? inv.child.firstName : t("parent.family")} · <span dir="ltr">{inv.number}</span>
              </p>
            </div>
          </div>
          <StatusBadge status={inv.status} className="hidden sm:inline-flex" />
        </div>
        <StatusBadge status={inv.status} className="sm:hidden" />
        {(inv.event || inv.trip || inv.activity) && <LinkChip event={inv.event} trip={inv.trip} activity={inv.activity} />}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Amount value={open ? inv.remaining : inv.amount} className="block font-display text-2xl font-extrabold text-ink" />
            {open && inv.paid > 0 && <p className="text-xs font-bold text-muted">{t("parent.remainingOf", { total: formatMoney(inv.amount, locale) })}</p>}
            <p className={cn("mt-1 flex items-center gap-1 text-xs font-bold", late ? "text-red-600" : open ? "text-ink-2" : "text-emerald-700")}>
              {late ? <AlertCircle className="size-3.5" /> : open ? <CalendarClock className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
              {late
                ? t("parent.overdueSince", { date: formatDate(inv.dueDate, locale) })
                : open
                  ? t("parent.dueIn", { date: formatDate(inv.dueDate, locale) })
                  : t("parent.paidOn", { date: formatDate(inv.paidAt ?? inv.updatedAt, locale) })}
            </p>
          </div>
          {open ? (
            <div className="relative z-10 w-full sm:w-auto">
              <PayOnlineButton invoiceId={inv.id} number={inv.number} description={inv.description} amountLabel={formatMoney(inv.remaining, locale)} label={t("actions.payOnline")} className="w-full sm:w-auto" />
            </div>
          ) : (
            <span className="relative z-10 inline-flex items-center gap-1 text-sm font-bold text-brand-600">
              {t("actions.receipt")} <ChevronRight className="rtl-flip size-4" />
            </span>
          )}
        </div>
        {open && inv.paid > 0 && (
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-label={t("invoice.progress", { percent })}>
            <div className="h-full rounded-full bg-gradient-to-r from-sky to-leaf" style={{ width: `${percent}%` }} />
          </div>
        )}
      </div>
    </li>
  );
}

/** Parent view of /dashboard/finance/invoices. */
export function FamilyInvoices({ invoices }: { invoices: FamilyInvoice[] }) {
  const t = useTranslations("finance");
  const locale = useLocale();
  const toPay = invoices.filter((i) => OPEN.includes(i.status));
  const paid = invoices.filter((i) => i.status === "PAID").sort((a, b) => (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0));
  const balance = toPay.reduce((s, i) => s + i.remaining, 0);
  const now = new Date();
  const next = toPay.filter((i) => i.dueDate >= now).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const paidThisYear = invoices.flatMap((i) => i.payments).filter((p) => p.status === "COMPLETED" && p.paidAt >= yearStart).reduce((s, p) => s + p.amount, 0);
  const hasOverdue = toPay.some((i) => i.dueDate < now);

  return (
    <div className="space-y-6">
      {/* Balance hero */}
      <section className={cn("relative overflow-hidden rounded-3xl p-5 text-white shadow-[var(--shadow-lift)] sm:p-7", balance ? "bg-gradient-to-br from-brand-600 via-brand-500 to-coral" : "bg-gradient-to-br from-leaf to-teal")}>
        <div className="bg-confetti pointer-events-none absolute inset-0 opacity-30" aria-hidden />
        <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-[1.4fr_1fr_1fr] sm:items-end sm:gap-5">
          <div className="col-span-2 sm:col-span-1">
            <p className="flex items-center gap-2 text-sm font-bold opacity-90">
              <Wallet className="size-4" /> {t("parent.balance")}
            </p>
            <p className="mt-1 font-display text-4xl font-extrabold tabular-nums sm:text-5xl">
              {formatMoney(balance, locale)}
            </p>
            <p className="mt-1 text-sm font-semibold opacity-90">{t("parent.balanceHint", { count: toPay.length })}</p>
          </div>
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
            <p className="text-xs font-bold opacity-85">{t("parent.nextDue")}</p>
            <p className="mt-0.5 font-display text-lg font-extrabold">{next ? formatDate(next.dueDate, locale) : "—"}</p>
          </div>
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
            <p className="text-xs font-bold opacity-85">{t("parent.paidThisYear")}</p>
            <p className="mt-0.5 font-display text-lg font-extrabold tabular-nums">
              {formatMoney(paidThisYear, locale)}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-ink">
          <span className={cn("size-2.5 rounded-full", hasOverdue ? "bg-red-500" : "bg-sun")} aria-hidden />
          {t("parent.toPay")}
          <span className="rounded-full bg-surface-2 px-2 text-xs font-bold text-muted">{toPay.length}</span>
        </h2>
        {toPay.length ? (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {toPay.map((inv) => (
              <InvoiceCard key={inv.id} inv={inv} locale={locale} />
            ))}
          </ul>
        ) : (
          <div className="card">
            <EmptyState compact icon={<PartyPopper className="size-5" />} title={t("parent.allClear")} description={t("parent.allClearHint")} />
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-ink">
          <span className="size-2.5 rounded-full bg-leaf" aria-hidden />
          {t("parent.paid")}
          <span className="rounded-full bg-surface-2 px-2 text-xs font-bold text-muted">{paid.length}</span>
        </h2>
        {paid.length ? (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {paid.map((inv) => (
              <InvoiceCard key={inv.id} inv={inv} locale={locale} />
            ))}
          </ul>
        ) : (
          <p className="card p-5 text-sm text-muted">{t("parent.noPaid")}</p>
        )}
      </section>
    </div>
  );
}

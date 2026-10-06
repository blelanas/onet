import { useLocale, useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { ArrowRight, Bus, CreditCard, FileCheck2, FileSignature, PartyPopper } from "lucide-react";
import { formatDate } from "@onet/shared";
import { formatMoney } from "@onet/shared";
import { cancelRegistrationAction } from "@/api/registrations";
import type { RegistrationRow } from "@api/modules/registrations/queries";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { CategoryIcon, DateTile, categoryColor } from "./visuals";
import { hm } from "@/components/registrations/format";

/** "My registrations" for parents / members: one friendly card per registration. */
export function FamilyRegistrations({ rows, canPay }: { rows: RegistrationRow[]; canPay: boolean }) {
  const t = useTranslations("events");
  const tc = useTranslations("common");
  const locale = useLocale();

  if (!rows.length) {
    return (
      <div className="card">
        <EmptyState
          title={t("registrations.familyEmpty")}
          description={t("registrations.familyEmptyHint")}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <LinkButton href="/dashboard/trips" variant="soft">
                <Bus className="size-4" /> {t("registrations.browseTrips")}
              </LinkButton>
              <LinkButton href="/dashboard/events" variant="soft">
                <PartyPopper className="size-4" /> {t("registrations.browseEvents")}
              </LinkButton>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {rows.map((r) => {
        const color = categoryColor(r.target.category);
        const href = `/dashboard/${r.kind === "event" ? "events" : "trips"}/${r.target.id}`;
        const unpaid = r.invoice && !["PAID", "CANCELLED"].includes(r.invoice.status) && r.status !== "CANCELLED";
        const cancelled = r.status === "CANCELLED";
        return (
          <li key={`${r.kind}:${r.id}`} className={`card overflow-hidden ${cancelled ? "opacity-70" : ""}`}>
            <div className="flex gap-3 p-4">
              <div className="relative">
                <DateTile date={r.target.date} locale={locale} />
                <span className="absolute -end-1.5 -bottom-1.5 grid size-6 place-items-center rounded-full text-white ring-2 ring-surface [&_svg]:size-3.5" style={{ background: color }}>
                  <CategoryIcon kind={r.kind} category={r.target.category} />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Link href={href} className="line-clamp-2 font-extrabold text-ink hover:text-brand-700">
                    {r.target.title}
                  </Link>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {t(`registrations.kind.${r.kind}`)} · {formatDate(r.target.date, locale, "long")} · <span dir="ltr">{hm(r.target.date, locale)}</span>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-surface-2 py-0.5 ps-0.5 pe-2.5 text-xs font-bold text-ink-2">
                    <Avatar firstName={r.member.firstName} lastName={r.member.lastName} src={r.member.photoUrl} size="xs" />
                    {r.member.firstName}
                  </span>
                  {r.kind === "trip" && !cancelled && (
                    <Badge tone={r.parentConsent ? "success" : "warning"}>
                      <FileSignature className="size-3" /> {t(r.parentConsent ? "registrations.consentOk" : "registrations.consentMissing")}
                    </Badge>
                  )}
                  {r.kind === "trip" && !cancelled && r.documentsStatus && (
                    <Badge tone={r.documentsStatus === "COMPLETE" ? "success" : r.documentsStatus === "PARTIAL" ? "warning" : "danger"}>
                      <FileCheck2 className="size-3" /> {t("registrations.docs")} : {tc(`status.${r.documentsStatus}`)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2/40 px-4 py-2.5">
              {r.invoice ? (
                <span className="me-auto flex items-center gap-2 text-sm font-bold text-ink">
                  <CreditCard className="size-4 text-muted" /> {formatMoney(r.invoice.amount, locale)} <StatusBadge status={r.invoice.status} />
                </span>
              ) : (
                <span className="me-auto">
                  <Badge tone="teal">{tc("fields.free")}</Badge>
                </span>
              )}
              {unpaid && canPay && (
                <LinkButton href={`/dashboard/finance/invoices/${r.invoice!.id}`} size="sm">
                  <CreditCard className="size-4" /> {tc("actions.pay")}
                </LinkButton>
              )}
              {!cancelled && r.target.date > new Date() && (
                <ConfirmButton action={cancelRegistrationAction.bind(null, r.kind, r.id)} size="sm" variant="ghost" title={t("cancel.title")} description={t(r.invoice?.status === "PAID" ? "cancel.paidText" : "cancel.text")} confirmLabel={t("cancel.confirm")} successMessage="toast.cancelled">
                  {tc("actions.cancel")}
                </ConfirmButton>
              )}
              <LinkButton href={href} size="icon-sm" variant="ghost" aria-label={tc("actions.details")}>
                <ArrowRight className="rtl-flip size-4" />
              </LinkButton>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

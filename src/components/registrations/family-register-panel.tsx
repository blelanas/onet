"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, CreditCard, Hourglass, Ticket, X } from "lucide-react";
import { registerMembers, cancelRegistrationAction } from "@/server/registrations/actions";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { ActionForm } from "@/components/ui/action-form";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { StatusBadge } from "@/components/ui/status-badge";

export type PanelEntry = {
  member: { id: string; firstName: string; lastName: string; photoUrl: string | null; age: number | null; isSelf: boolean };
  registration: { id: string; status: string; invoice: { id: string; status: string; amount: number } | null } | null;
  reason: string | null;
};

/**
 * Family registration panel for an event: pick one or several members, see the total, register;
 * then follow status, pay and cancel per member.
 */
export function FamilyRegisterPanel({ targetId, entries, price, full }: { targetId: string; entries: PanelEntry[]; price: number; full: boolean }) {
  const t = useTranslations("events");
  const tc = useTranslations("common");
  const locale = useLocale();
  const selectable = entries.filter((e) => !e.reason);
  const [selected, setSelected] = useState<string[]>(selectable.length === 1 ? [selectable[0].member.id] : []);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const total = price * selected.length;

  return (
    <ActionForm action={registerMembers} onSuccess={() => setSelected([])} className="space-y-3">
      {(pending) => (
        <>
          <input type="hidden" name="kind" value="event" />
          <input type="hidden" name="targetId" value={targetId} />
          <ul className="space-y-2">
            {entries.map((e) => {
              const reg = e.registration && e.registration.status !== "CANCELLED" ? e.registration : null;
              const checked = selected.includes(e.member.id);
              const unpaid = reg?.invoice && !["PAID", "CANCELLED"].includes(reg.invoice.status);
              return (
                <li key={e.member.id} className={cn("rounded-2xl border p-3 transition", checked ? "border-brand-300 bg-brand-50/60 ring-2 ring-brand-100" : "border-line bg-surface")}>
                  <label className={cn("flex items-center gap-3", !e.reason && "cursor-pointer")}>
                    {!e.reason ? (
                      <input type="checkbox" name="memberIds[]" value={e.member.id} checked={checked} onChange={() => toggle(e.member.id)} className="size-5 shrink-0 cursor-pointer rounded-md accent-brand-600" />
                    ) : (
                      <span className={cn("grid size-5 shrink-0 place-items-center rounded-full", reg ? "bg-leaf text-white" : "bg-surface-2 text-muted")}>{reg ? <Check className="size-3.5" /> : <X className="size-3" />}</span>
                    )}
                    <Avatar firstName={e.member.firstName} lastName={e.member.lastName} src={e.member.photoUrl} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-ink">
                        {e.member.firstName} {e.member.isSelf && <span className="text-xs font-semibold text-muted">({t("panel.me")})</span>}
                      </span>
                      <span className="block text-xs text-muted">
                        {e.member.age != null && tc("fields.years", { count: e.member.age })}
                        {e.reason && e.reason !== "registered" && <span className="text-amber-700"> · {t(`eligibility.${e.reason}`)}</span>}
                        {!e.reason && full && <span className="text-violet-700"> · {t("panel.willWaitlist")}</span>}
                      </span>
                    </span>
                    {reg && <StatusBadge status={reg.status} />}
                  </label>
                  {reg && (
                    <div className="mt-2.5 flex flex-wrap items-center justify-end gap-2 border-t border-dashed border-line pt-2.5">
                      {reg.invoice && (
                        <span className="me-auto flex items-center gap-1.5 text-xs font-bold text-ink-2">
                          <CreditCard className="size-3.5 text-muted" /> {formatMoney(reg.invoice.amount, locale)} <StatusBadge status={reg.invoice.status} />
                        </span>
                      )}
                      {reg.status === "WAITLIST" && (
                        <span className="me-auto flex items-center gap-1.5 text-xs font-semibold text-violet-700">
                          <Hourglass className="size-3.5" /> {t("panel.waitlistHint")}
                        </span>
                      )}
                      {unpaid && (
                        <LinkButton href={`/dashboard/finance/invoices/${reg.invoice!.id}`} size="sm" variant="primary">
                          <CreditCard className="size-4" /> {tc("actions.pay")}
                        </LinkButton>
                      )}
                      <ConfirmButton action={cancelRegistrationAction.bind(null, "event", reg.id)} size="sm" variant="ghost" title={t("cancel.title")} description={t(reg.invoice?.status === "PAID" ? "cancel.paidText" : "cancel.text")} confirmLabel={t("cancel.confirm")} successMessage="toast.cancelled">
                        {tc("actions.cancel")}
                      </ConfirmButton>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {selectable.length > 0 && (
            <div className="rounded-2xl bg-surface-2/70 p-3">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-semibold text-ink-2">{t("panel.total", { count: selected.length })}</span>
                <span className="font-display text-xl font-extrabold text-ink tabular-nums">{price > 0 ? formatMoney(total, locale) : tc("fields.free")}</span>
              </div>
              <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!selected.length}>
                <Ticket className="size-5" /> {full ? t("panel.joinWaitlist") : t("panel.register", { count: selected.length })}
              </Button>
              {price > 0 && <p className="mt-2 text-center text-xs text-muted">{t("panel.invoiceHint")}</p>}
            </div>
          )}
          {!selectable.length && entries.every((e) => e.reason && e.reason !== "registered") && <Badge tone="warning">{t(`eligibility.${entries[0]?.reason ?? "closed"}`)}</Badge>}
        </>
      )}
    </ActionForm>
  );
}

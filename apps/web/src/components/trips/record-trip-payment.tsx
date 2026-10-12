import { useLocale, useTranslations } from "use-intl";
import { useRef, useState } from "react";
import { HandCoins } from "lucide-react";
import { formatMoney } from "@onet/shared";
import { recordTripPayment } from "@/api/trips";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

const METHODS = ["CASH", "BANK_TRANSFER", "CHECK", "OTHER"] as const;

/** Trip manager: record a payment on a participant's invoice (amount ≤ remaining balance). */
export function RecordTripPaymentButton({ tripId, registrationId, name, remaining, compact }: { tripId: string; registrationId: string; name: string; remaining: number; compact?: boolean }) {
  const t = useTranslations("trips.manage");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const max = (remaining / 1000).toFixed(3).replace(/\.?0+$/, "");
  const remainingLabel = formatMoney(remaining, locale);

  return (
    <>
      <Button variant="success" size="sm" onClick={() => setOpen(true)} aria-label={`${t("recordPayment")} — ${name}`}>
        <HandCoins className="size-4" /> <span className={compact ? "sr-only" : undefined}>{t("recordPayment")}</span>
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("recordPaymentTitle", { name })} description={t("remainingHint", { amount: remainingLabel })}>
        {open && (
          <ActionForm action={recordTripPayment} successMessage="toast.paid" onSuccess={() => setOpen(false)} className="space-y-4">
            {(pending) => (
              <>
                <input type="hidden" name="tripId" value={tripId} />
                <input type="hidden" name="registrationId" value={registrationId} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Input ref={amountRef} name="amount" type="number" inputMode="decimal" step="0.001" min="0.001" max={max} label={t("amount")} defaultValue={max} required dir="ltr" className="font-bold tabular-nums" />
                    <button type="button" className="text-xs font-bold text-brand-600 hover:underline" onClick={() => amountRef.current && (amountRef.current.value = max)}>
                      {t("payAll")} · <span dir="ltr">{remainingLabel}</span>
                    </button>
                  </div>
                  <Select name="method" label={t("method")} defaultValue="CASH" required options={METHODS.map((m) => ({ value: m, label: tc(`enums.paymentMethod.${m}`) }))} />
                  <Input name="note" label={t("note")} maxLength={500} wrapperClassName="sm:col-span-2" autoComplete="off" />
                </div>
                <div className="flex justify-end gap-2 border-t border-line pt-4">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    {tc("actions.cancel")}
                  </Button>
                  <Button type="submit" variant="success" loading={pending}>
                    {tc("actions.save")}
                  </Button>
                </div>
              </>
            )}
          </ActionForm>
        )}
      </Modal>
    </>
  );
}

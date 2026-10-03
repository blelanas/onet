import { useTranslations } from "use-intl";
import { useRef, useState } from "react";
import { HandCoins, Printer } from "lucide-react";
import { recordPayment } from "@/api/finance";
import { toDateInput } from "@onet/shared";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

export function PrintButton({ className }: { className?: string }) {
  const t = useTranslations("finance.invoice");
  return (
    <Button variant="outline" className={className} onClick={() => window.print()}>
      <Printer className="size-4" /> {t("print")}
    </Button>
  );
}

const METHODS = ["CASH", "BANK_TRANSFER", "CHECK", "OTHER"] as const;

/** Staff: record a manual payment (amount ≤ remaining). */
export function RecordPaymentButton({ invoiceId, remaining, remainingLabel, className }: { invoiceId: string; remaining: number; remainingLabel: string; className?: string }) {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const max = (remaining / 1000).toFixed(3).replace(/\.?0+$/, "");

  return (
    <>
      <Button variant="success" size="lg" className={className} onClick={() => setOpen(true)}>
        <HandCoins className="size-5" /> {t("actions.recordPayment")}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("actions.recordPayment")} description={t("form.paymentAmountHint", { amount: remainingLabel })}>
        <ActionForm action={recordPayment} successMessage="toast.paid" onSuccess={() => setOpen(false)} className="space-y-4">
          {(pending) => (
            <>
              <input type="hidden" name="invoiceId" value={invoiceId} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Input ref={amountRef} name="amount" type="number" inputMode="decimal" step="0.001" min="0.001" max={max} label={t("form.paymentAmount")} defaultValue={max} required dir="ltr" className="font-bold tabular-nums" />
                  <button type="button" className="text-xs font-bold text-brand-600 hover:underline" onClick={() => amountRef.current && (amountRef.current.value = max)}>
                    {t("form.payFull")} · <span dir="ltr">{remainingLabel}</span>
                  </button>
                </div>
                <Select name="method" label={t("form.method")} defaultValue="CASH" required options={METHODS.map((m) => ({ value: m, label: tc(`enums.paymentMethod.${m}`) }))} />
                <Input name="reference" label={t("form.reference")} hint={t("form.referenceHint")} dir="ltr" autoComplete="off" />
                <Input name="paidAt" type="date" label={t("form.paidAt")} defaultValue={toDateInput(new Date())} max={toDateInput(new Date())} />
                <Textarea name="notes" label={t("form.notes")} rows={2} wrapperClassName="sm:col-span-2" />
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
      </Modal>
    </>
  );
}

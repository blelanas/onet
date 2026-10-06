import { useTranslations } from "use-intl";
import { useState, useTransition } from "react";
import { useRouter } from "@/lib/router";
import { toast } from "sonner";
import { CreditCard, Lock } from "lucide-react";
import { payInvoiceOnline } from "@/api/finance";
import { cn } from "@/lib/utils";
import { Button, type ButtonSize } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

/** Big "Pay" button → confirmation sheet → provider checkout (mock completes instantly). */
export function PayOnlineButton({
  invoiceId,
  number,
  description,
  amountLabel,
  size = "lg",
  className,
  label,
}: {
  invoiceId: string;
  number: string;
  description: string;
  amountLabel: string;
  size?: ButtonSize;
  className?: string;
  label?: string;
}) {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const pay = () =>
    start(async () => {
      const res = await payInvoiceOnline(invoiceId);
      if (res.ok) {
        if (res.data?.redirectUrl) {
          window.location.href = res.data.redirectUrl;
          return;
        }
        toast.success(t("toast.paidOnline"));
        setOpen(false);
        router.refresh();
      } else toast.error(res.error.startsWith("errors.") ? tc(res.error) : res.error);
    });

  return (
    <>
      <Button size={size} className={cn("bg-gradient-to-r from-brand-600 to-coral", className)} onClick={() => setOpen(true)}>
        <CreditCard className="size-5" /> {label ?? t("actions.payAmount", { amount: amountLabel })}
      </Button>
      <Modal
        open={open}
        // Always sync: Esc closes the native <dialog> regardless (it can't be reliably blocked), and a
        // stale `open` would keep the button from reopening it. A pending payment still completes + toasts.
        onClose={() => setOpen(false)}
        size="sm"
        title={t("confirm.payTitle", { amount: amountLabel })}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              {tc("actions.cancel")}
            </Button>
            <Button onClick={pay} loading={pending}>
              <Lock className="size-4" /> {t("confirm.payConfirm")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-brand-600 via-brand-500 to-coral p-5 text-white shadow-[var(--shadow-brand)]">
            <p className="text-xs font-bold tracking-wide uppercase opacity-80" dir="ltr">
              {number}
            </p>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums">
              {amountLabel}
            </p>
            <p className="mt-1 truncate text-sm opacity-90">{description}</p>
          </div>
          <p className="text-sm text-ink-2">{t("confirm.payText", { number, description, amount: amountLabel })}</p>
          <p className="flex items-center gap-2 text-xs font-bold text-emerald-700">
            <Lock className="size-3.5" /> {t("bank.secure")}
          </p>
        </div>
      </Modal>
    </>
  );
}

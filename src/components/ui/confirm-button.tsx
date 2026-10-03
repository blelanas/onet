"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/actions";
import { Button, type ButtonSize, type ButtonVariant } from "./button";
import { Modal } from "./modal";

/**
 * Button that asks for confirmation, then runs a server action.
 * Pass an action already bound to its arguments: `action={deleteMember.bind(null, id)}`.
 */
export function ConfirmButton({
  action,
  children,
  title,
  description,
  confirmLabel,
  variant = "ghost",
  size = "sm",
  tone = "danger",
  successMessage = "toast.deleted",
  redirectTo,
  className,
  ariaLabel,
}: {
  action: () => Promise<ActionResult<unknown>>;
  children: React.ReactNode;
  title?: string;
  description?: string;
  confirmLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  tone?: "danger" | "primary";
  successMessage?: string;
  redirectTo?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const t = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const tr = (k: string) => (k.startsWith("errors.") || k.startsWith("toast.") ? t(k) : k);

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)} aria-label={ariaLabel}>
        {children}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title={
          <span className="flex items-center gap-2">
            <span className={tone === "danger" ? "text-red-600" : "text-brand-600"}>
              <AlertTriangle className="size-5" />
            </span>
            {title ?? t("confirm.title")}
          </span>
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              {t("actions.cancel")}
            </Button>
            <Button
              variant={tone === "danger" ? "danger" : "primary"}
              loading={pending}
              onClick={() =>
                start(async () => {
                  const res = await action();
                  if (res.ok) {
                    toast.success(tr(res.message ?? successMessage));
                    setOpen(false);
                    if (redirectTo) router.push(redirectTo);
                    else router.refresh();
                  } else toast.error(tr(res.error));
                })
              }
            >
              {confirmLabel ?? t("actions.confirm")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">{description ?? t("confirm.description")}</p>
      </Modal>
    </>
  );
}

/** Fire-and-forget action button (no confirmation) with toast + refresh. */
export function ActionButton({
  action,
  children,
  variant = "outline",
  size = "sm",
  successMessage = "toast.saved",
  className,
  ariaLabel,
}: {
  action: () => Promise<ActionResult<unknown>>;
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  successMessage?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const t = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const tr = (k: string) => (k.startsWith("errors.") || k.startsWith("toast.") ? t(k) : k);
  return (
    <Button
      variant={variant}
      size={size}
      loading={pending}
      className={className}
      aria-label={ariaLabel}
      onClick={() =>
        start(async () => {
          const res = await action();
          if (res.ok) {
            toast.success(tr(res.message ?? successMessage));
            router.refresh();
          } else toast.error(tr(res.error));
        })
      }
    >
      {children}
    </Button>
  );
}

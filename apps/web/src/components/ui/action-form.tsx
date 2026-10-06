import { useTranslations } from "use-intl";
import { queryClient } from "@/lib/query";
import { useRouter } from "@/lib/router";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/api";
import { FieldErrorsContext } from "./form-context";

type Props<T> = Omit<React.FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit" | "children"> & {
  action: (fd: FormData) => Promise<ActionResult<T>>;
  /** i18n key (common namespace) or literal text shown on success. */
  successMessage?: string;
  /** Where to navigate after success. A function receives the action data. */
  redirectTo?: string | ((data: T | undefined) => string);
  onSuccess?: (data: T | undefined) => void;
  resetOnSuccess?: boolean;
  children: React.ReactNode | ((pending: boolean) => React.ReactNode);
};

/**
 * Progressive client wrapper around a server action: pending state, field errors (consumed by
 * <Input name=…/>), toast feedback, optional redirect + router.refresh().
 */
export function ActionForm<T>({ action, successMessage = "toast.saved", redirectTo, onSuccess, resetOnSuccess, children, ...rest }: Props<T>) {
  const t = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const tr = (k: string) => (k.startsWith("errors.") || k.startsWith("toast.") ? t(k) : k);

  return (
    <FieldErrorsContext.Provider value={errors}>
      <form
        {...rest}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          // Don't submit while a file is still uploading (its URL isn't in the form yet).
          if (form.querySelector('[data-uploading="true"]')) {
            toast.info(t("upload.pending"));
            return;
          }
          const fd = new FormData(form);
          start(async () => {
            const res = await action(fd);
            if (res.ok) {
              setErrors({});
              toast.success(tr(res.message ?? successMessage));
              onSuccess?.(res.data);
              if (resetOnSuccess) form.reset();
              if (redirectTo) {
                // Mark every cached query stale so the destination page refetches fresh data.
                void queryClient.invalidateQueries({ refetchType: "none" });
                router.push(typeof redirectTo === "function" ? redirectTo(res.data) : redirectTo);
              }
              else router.refresh();
            } else {
              setErrors(res.fieldErrors ?? {});
              toast.error(tr(res.error));
            }
          });
        }}
      >
        <fieldset disabled={pending} className="contents">
          {typeof children === "function" ? children(pending) : children}
        </fieldset>
      </form>
    </FieldErrorsContext.Provider>
  );
}

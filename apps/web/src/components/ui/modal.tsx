import { useTranslations } from "use-intl";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Accessible modal built on native <dialog> (focus trap + Esc for free). Bottom sheet on mobile. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useTranslations("common");
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const width = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" }[size];
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        "m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-3xl bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/40 backdrop:backdrop-blur-sm open:animate-[var(--animate-fade-up)] sm:m-auto sm:rounded-3xl",
        width,
      )}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
            <div>
              <h2 className="text-xl font-bold">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
            <button onClick={onClose} className="-me-2 rounded-xl p-2 text-muted hover:bg-surface-2 hover:text-ink" aria-label={t("actions.close")}>
              <X className="size-5" />
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface-2/50 px-6 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

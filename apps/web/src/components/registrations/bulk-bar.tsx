import { useTranslations } from "use-intl";
import { useEffect, useState } from "react";
import { bulkRegistrations } from "@/api/registrations";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const BULK_FORM_ID = "bulk-registrations";

/** Bulk status bar for the registrations console. Row checkboxes use form={BULK_FORM_ID}. */
export function BulkBar() {
  const t = useTranslations("events");
  const tc = useTranslations("common");
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => {
      const boxes = Array.from(document.querySelectorAll<HTMLInputElement>(`input[form="${BULK_FORM_ID}"][name="ids[]"]`));
      // Desktop table and mobile cards both render a checkbox; count unique checked values.
      setCount(new Set(boxes.filter((b) => b.checked).map((b) => b.value)).size);
    };
    document.addEventListener("change", update);
    update();
    return () => document.removeEventListener("change", update);
  }, []);
  const toggleAll = (on: boolean) => {
    document.querySelectorAll<HTMLInputElement>(`input[form="${BULK_FORM_ID}"][name="ids[]"]`).forEach((b) => {
      if (b.offsetParent !== null) b.checked = on;
    });
    document.dispatchEvent(new Event("change"));
  };
  return (
    <ActionForm id={BULK_FORM_ID} action={bulkRegistrations} onSuccess={() => toggleAll(false)} className={cn("sticky top-16 z-20 mb-4 flex flex-wrap items-center gap-2 rounded-2xl border p-2.5 transition", count ? "border-brand-200 bg-brand-50/90 shadow-[var(--shadow-lift)] backdrop-blur" : "border-line bg-surface")}>
      {(pending) => (
        <>
          <label className="flex cursor-pointer items-center gap-2 ps-1.5 text-sm font-bold text-ink-2">
            <input type="checkbox" className="size-4 cursor-pointer accent-brand-600" onChange={(e) => toggleAll(e.target.checked)} aria-label={t("bulk.selectAll")} />
            {count ? t("bulk.selected", { count }) : t("bulk.selectAll")}
          </label>
          <select name="op" defaultValue="CONFIRMED" aria-label={t("bulk.action")} className={cn(inputClasses, "ms-auto w-auto py-1.5")}>
            <option value="CONFIRMED">{t("actions.confirm")}</option>
            <option value="WAITLIST">{t("actions.waitlist")}</option>
            <option value="CANCELLED">{t("actions.cancelRegistration")}</option>
          </select>
          <Button type="submit" size="sm" loading={pending} disabled={!count}>
            {tc("actions.confirm")}
          </Button>
        </>
      )}
    </ActionForm>
  );
}

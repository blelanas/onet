"use client";
import { useTranslations } from "next-intl";
import { NotebookPen } from "lucide-react";
import { addActivityReport } from "@/server/activities/actions";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

export function ReportForm({ activityId, defaultDate }: { activityId: string; defaultDate: string }) {
  const t = useTranslations("activities.reports");
  return (
    <ActionForm action={addActivityReport} resetOnSuccess successMessage="toast.created" className="mb-5 rounded-2xl border border-dashed border-line bg-surface-2/40 p-4">
      {(pending) => (
        <div className="grid gap-3">
          <input type="hidden" name="activityId" value={activityId} />
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <Input name="date" type="date" label={t("date")} defaultValue={defaultDate} required />
            <Textarea name="summary" label={t("summary")} placeholder={t("placeholder")} rows={3} required maxLength={4000} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={pending}>
              <NotebookPen className="size-4" /> {t("add")}
            </Button>
          </div>
        </div>
      )}
    </ActionForm>
  );
}

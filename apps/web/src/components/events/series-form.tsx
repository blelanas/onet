import { useState } from "react";
import { useTranslations } from "use-intl";
import { SERIES_KINDS } from "@onet/shared";
import { saveSeries } from "@/api/events";
import { ActionForm } from "@/components/ui/action-form";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Upload } from "@/components/ui/upload";
import { ColorPicker } from "./series-visuals";

export type SeriesFormValues = {
  id?: string;
  name?: string;
  nameAr?: string | null;
  kind?: string;
  description?: string | null;
  coverUrl?: string | null;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
};

/** Button + modal to create or edit a programme (admins). */
export function SeriesFormButton({ initial = {}, children, variant = "primary", size = "md", redirect }: { initial?: SeriesFormValues; children: React.ReactNode; variant?: ButtonVariant; size?: ButtonSize; redirect?: boolean }) {
  const t = useTranslations("events.series");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={initial.id ? t("edit") : t("new")} size="lg">
        <SeriesForm initial={initial} onDone={() => setOpen(false)} redirect={redirect} />
      </Modal>
    </>
  );
}

function SeriesForm({ initial, onDone, redirect }: { initial: SeriesFormValues; onDone: () => void; redirect?: boolean }) {
  const t = useTranslations("events.series.form");
  const tc = useTranslations("common");
  return (
    <ActionForm
      action={saveSeries}
      successMessage={initial.id ? "toast.saved" : "toast.created"}
      onSuccess={onDone}
      redirectTo={redirect ? (d) => `/dashboard/events/series/${d?.id}` : undefined}
      className="flex flex-col gap-4"
    >
      {(pending) => (
        <>
          {initial.id && <input type="hidden" name="id" value={initial.id} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input name="name" label={t("name")} hint={t("nameHint")} defaultValue={initial.name} required maxLength={120} />
            <Input name="nameAr" label={t("nameAr")} hint={t("nameArHint")} defaultValue={initial.nameAr ?? ""} dir="rtl" lang="ar" maxLength={120} />
            <Select name="kind" label={t("kind")} hint={t("kindHint")} defaultValue={initial.kind ?? "FESTIVAL"} options={SERIES_KINDS.map((k) => ({ value: k, label: tc(`enums.SERIES_KINDS.${k}`) }))} required />
            {initial.id && <Input name="sortOrder" type="number" label={t("sortOrder")} defaultValue={initial.sortOrder ?? 0} dir="ltr" />}
          </div>
          <Textarea name="description" label={tc("fields.description")} defaultValue={initial.description ?? ""} rows={3} />
          <Upload name="coverUrl" kind="image" label={tc("fields.cover")} defaultValue={initial.coverUrl} />
          <ColorPicker name="color" label={t("color")} defaultValue={initial.color} />
          {initial.id && (
            <>
              <input type="hidden" name="isActive" value="0" />
              <Checkbox name="isActive" value="1" label={t("active")} description={t("activeHint")} defaultChecked={initial.isActive ?? true} />
            </>
          )}
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="outline" onClick={onDone} disabled={pending}>
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" loading={pending}>
              {tc("actions.save")}
            </Button>
          </div>
        </>
      )}
    </ActionForm>
  );
}

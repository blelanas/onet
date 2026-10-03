import { useTranslations } from "use-intl";
import { useState } from "react";
import { saveEvent } from "@/api/events";
import { EVENT_CATEGORIES, EVENT_STATUSES } from "@onet/shared";
import { toDateTimeInput } from "@onet/shared";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { Upload } from "@/components/ui/upload";
import { FormSection } from "@/components/registrations/form-section";

export type EventFormValues = {
  id?: string;
  title?: string;
  description?: string | null;
  category?: string;
  coverUrl?: string | null;
  startAt?: Date | string | null;
  endAt?: Date | string | null;
  location?: string | null;
  organizer?: string | null;
  capacity?: number;
  registrationDeadline?: Date | string | null;
  price?: number;
  requiresPayment?: boolean;
  status?: string;
  isPublic?: boolean;
};

export function EventForm({ initial }: { initial: EventFormValues }) {
  const t = useTranslations("events.form");
  const tc = useTranslations("common");
  const [price, setPrice] = useState(initial.price ? String(initial.price / 1000) : "");
  const paid = Number(price.replace(",", ".")) > 0;

  return (
    <ActionForm action={saveEvent} successMessage={initial.id ? "toast.saved" : "toast.created"} redirectTo={(d) => `/dashboard/events/${d?.id}`} className="space-y-5">
      {(pending) => (
        <>
          {initial.id && <input type="hidden" name="id" value={initial.id} />}
          <FormSection title={t("general")}>
            <Input name="title" label={tc("fields.title")} defaultValue={initial.title} required wrapperClassName="sm:col-span-2" />
            <Select name="category" label={tc("fields.category")} defaultValue={initial.category ?? "CHILDREN"} options={EVENT_CATEGORIES.map((v) => ({ value: v, label: tc(`enums.eventCategory.${v}`) }))} required />
            <Select name="status" label={tc("fields.status")} defaultValue={initial.status ?? "PUBLISHED"} options={EVENT_STATUSES.map((v) => ({ value: v, label: tc(`status.${v}`) }))} hint={t("statusHint")} />
            <Textarea name="description" label={tc("fields.description")} defaultValue={initial.description ?? ""} rows={4} wrapperClassName="sm:col-span-2" />
            <Upload name="coverUrl" kind="image" label={tc("fields.cover")} defaultValue={initial.coverUrl} className="sm:col-span-2" />
          </FormSection>

          <FormSection title={t("when")}>
            <Input name="startAt" type="datetime-local" label={t("startAt")} defaultValue={toDateTimeInput(initial.startAt)} required />
            <Input name="endAt" type="datetime-local" label={t("endAt")} defaultValue={toDateTimeInput(initial.endAt)} required />
            <Input name="location" label={tc("fields.location")} defaultValue={initial.location ?? ""} />
            <Input name="organizer" label={t("organizer")} defaultValue={initial.organizer ?? "ONET Teboulba"} />
          </FormSection>

          <FormSection title={t("registration")}>
            <Input name="capacity" type="number" min={1} label={tc("fields.capacity")} defaultValue={initial.capacity ?? 100} required />
            <Input name="registrationDeadline" type="datetime-local" label={tc("fields.deadline")} defaultValue={toDateTimeInput(initial.registrationDeadline)} hint={t("deadlineHint")} />
            <Input name="price" type="number" min={0} step="0.5" inputMode="decimal" label={t("priceTnd")} value={price} onChange={(e) => setPrice(e.target.value)} hint={t("priceHint")} dir="ltr" />
            <div className="space-y-2 pt-6">
              <Checkbox name="requiresPayment" label={t("requiresPayment")} description={t("requiresPaymentHint")} defaultChecked={initial.requiresPayment ?? true} disabled={!paid} />
              <Checkbox name="isPublic" label={tc("fields.public")} description={t("publicHint")} defaultChecked={initial.isPublic ?? true} />
            </div>
          </FormSection>

          <div className="sticky bottom-20 z-10 flex justify-end gap-2 rounded-2xl border border-line bg-surface/90 p-3 shadow-[var(--shadow-lift)] backdrop-blur lg:bottom-4">
            <Button variant="outline" onClick={() => history.back()}>
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

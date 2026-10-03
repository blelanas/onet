"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { saveTrip } from "@/server/trips/actions";
import { TRIP_CATEGORIES, TRIP_STATUSES } from "@/lib/constants";
import { toDateTimeInput } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { ActionForm } from "@/components/ui/action-form";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { Upload } from "@/components/ui/upload";
import { FormSection } from "@/components/registrations/form-section";

export type TripFormValues = {
  id?: string;
  title?: string;
  destination?: string;
  category?: string;
  description?: string | null;
  program?: string | null;
  coverUrl?: string | null;
  departureLocation?: string;
  departAt?: Date | string | null;
  returnAt?: Date | string | null;
  capacity?: number;
  price?: number;
  requiredDocuments?: string | null;
  registrationDeadline?: Date | string | null;
  ageMin?: number | null;
  ageMax?: number | null;
  status?: string;
  isPublic?: boolean;
  monitorIds?: string[];
};

export function TripForm({ initial, monitors }: { initial: TripFormValues; monitors: { id: string; firstName: string; lastName: string; photoUrl: string | null }[] }) {
  const t = useTranslations("trips.form");
  const tc = useTranslations("common");
  const [picked, setPicked] = useState<string[]>(initial.monitorIds ?? []);

  return (
    <ActionForm action={saveTrip} successMessage={initial.id ? "toast.saved" : "toast.created"} redirectTo={(d) => `/dashboard/trips/${d?.id}`} className="space-y-5">
      {(pending) => (
        <>
          {initial.id && <input type="hidden" name="id" value={initial.id} />}
          <FormSection title={t("general")}>
            <Input name="title" label={tc("fields.title")} defaultValue={initial.title} required wrapperClassName="sm:col-span-2" />
            <Input name="destination" label={t("destination")} defaultValue={initial.destination} required />
            <Select name="category" label={tc("fields.category")} defaultValue={initial.category ?? "EXCURSION"} options={TRIP_CATEGORIES.map((v) => ({ value: v, label: tc(`enums.tripCategory.${v}`) }))} required />
            <Textarea name="description" label={tc("fields.description")} defaultValue={initial.description ?? ""} rows={3} wrapperClassName="sm:col-span-2" />
            <Upload name="coverUrl" kind="image" label={tc("fields.cover")} defaultValue={initial.coverUrl} className="sm:col-span-2" />
          </FormSection>

          <FormSection title={t("logistics")}>
            <Input name="departureLocation" label={t("departureLocation")} defaultValue={initial.departureLocation ?? "Maison de l'enfance, Teboulba"} required wrapperClassName="sm:col-span-2" />
            <Input name="departAt" type="datetime-local" label={t("departAt")} defaultValue={toDateTimeInput(initial.departAt)} required />
            <Input name="returnAt" type="datetime-local" label={t("returnAt")} defaultValue={toDateTimeInput(initial.returnAt)} required />
            <Textarea name="program" label={t("program")} hint={t("programHint")} defaultValue={initial.program ?? ""} rows={6} wrapperClassName="sm:col-span-2" className="font-mono text-[13px]" placeholder={"07:00 | …\n09:30 | …"} />
            <Textarea name="requiredDocuments" label={t("requiredDocuments")} hint={t("documentsHint")} defaultValue={initial.requiredDocuments ?? ""} rows={3} wrapperClassName="sm:col-span-2" />
          </FormSection>

          <FormSection title={t("registration")}>
            <Input name="capacity" type="number" min={1} label={tc("fields.capacity")} defaultValue={initial.capacity ?? 40} required />
            <Input name="price" type="number" min={0} step="0.5" inputMode="decimal" label={t("priceTnd")} defaultValue={initial.price ? initial.price / 1000 : ""} hint={t("priceHint")} dir="ltr" />
            <Input name="ageMin" type="number" min={0} max={99} label={t("ageMin")} defaultValue={initial.ageMin ?? ""} />
            <Input name="ageMax" type="number" min={0} max={99} label={t("ageMax")} defaultValue={initial.ageMax ?? ""} />
            <Input name="registrationDeadline" type="datetime-local" label={tc("fields.deadline")} defaultValue={toDateTimeInput(initial.registrationDeadline)} />
            <Select name="status" label={tc("fields.status")} defaultValue={initial.status ?? "OPEN"} options={TRIP_STATUSES.map((v) => ({ value: v, label: tc(`status.${v}`) }))} hint={t("statusHint")} />
            <Checkbox name="isPublic" label={tc("fields.public")} defaultChecked={initial.isPublic ?? true} className="sm:col-span-2" />
          </FormSection>

          <FormSection title={t("monitors")} description={t("monitorsHint")}>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              {monitors.map((m) => {
                const on = picked.includes(m.id);
                return (
                  <label key={m.id} className={cn("flex cursor-pointer items-center gap-2 rounded-full border py-1 ps-1 pe-3 text-sm font-bold transition", on ? "border-sky-300 bg-sky-soft text-sky-800" : "border-line bg-surface text-ink-2 hover:border-brand-200")}>
                    <input type="checkbox" name="monitorIds[]" value={m.id} checked={on} onChange={() => setPicked((p) => (on ? p.filter((x) => x !== m.id) : [...p, m.id]))} className="sr-only" />
                    <Avatar firstName={m.firstName} lastName={m.lastName} src={m.photoUrl} size="xs" />
                    {m.firstName} {m.lastName}
                  </label>
                );
              })}
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

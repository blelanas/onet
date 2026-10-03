"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { saveActivity } from "@/server/activities/actions";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { Upload } from "@/components/ui/upload";
import { ACTIVITY_CATEGORIES, ACTIVITY_STATUSES, CATEGORY_COLORS } from "@/lib/constants";
import { toDateInput } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { ACTIVITY_ICONS } from "./category-icon";

export type ActivityFormValues = {
  id?: string;
  title?: string;
  description?: string | null;
  category?: string;
  coverUrl?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
  durationMin?: number;
  location?: string | null;
  materials?: string | null;
  monitorId?: string | null;
  dayOfWeek?: number | null;
  startTime?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  schedule?: string | null;
  capacity?: number;
  status?: string;
  groupId?: string | null;
  eventId?: string | null;
  isPublic?: boolean;
};

type Opt = { id: string; name: string };

function FormSection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("card p-5 sm:p-6", className)}>
      <h2 className="mb-4 text-lg font-bold text-ink">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function ActivityForm({ initial, monitors, groups, events }: { initial: ActivityFormValues; monitors: Opt[]; groups: Opt[]; events: Opt[] }) {
  const t = useTranslations("activities.form");
  const tc = useTranslations("common");
  const [category, setCategory] = useState(initial.category ?? "GAMES");

  return (
    <ActionForm action={saveActivity} successMessage={initial.id ? "toast.saved" : "toast.created"} redirectTo={(d) => `/dashboard/activities/${d?.id}`} className="space-y-5">
      {(pending) => (
        <>
          {initial.id && <input type="hidden" name="id" value={initial.id} />}
          <input type="hidden" name="category" value={category} />

          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-ink">{tc("fields.category")}</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9" role="radiogroup" aria-label={tc("fields.category")}>
              {ACTIVITY_CATEGORIES.map((c) => {
                const I = ACTIVITY_ICONS[c];
                const color = CATEGORY_COLORS[c];
                const active = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setCategory(c)}
                    className={cn("relative flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-xs font-bold transition", active ? "text-white shadow-md" : "border-line text-ink-2 hover:-translate-y-0.5")}
                    style={active ? { background: color, borderColor: color } : { color }}
                  >
                    {active && <Check className="absolute end-1.5 top-1.5 size-3.5" />}
                    <I className="size-6" />
                    <span className={active ? "text-white" : "text-ink-2"}>{tc(`enums.activityCategory.${c}`)}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <FormSection title={t("general")}>
                <Input name="title" label={tc("fields.title")} defaultValue={initial.title} required maxLength={140} wrapperClassName="sm:col-span-2" />
                <Textarea name="description" label={tc("fields.description")} defaultValue={initial.description ?? ""} rows={4} wrapperClassName="sm:col-span-2" />
                <Input name="ageMin" type="number" min={0} max={99} label={t("ageMin")} defaultValue={initial.ageMin ?? ""} />
                <Input name="ageMax" type="number" min={0} max={99} label={t("ageMax")} defaultValue={initial.ageMax ?? ""} />
                <Input name="location" label={tc("fields.location")} defaultValue={initial.location ?? ""} />
                <Input name="durationMin" type="number" min={5} step={5} label={t("duration")} defaultValue={initial.durationMin ?? 60} required />
                <Textarea name="materials" label={t("materials")} hint={t("materialsHint")} defaultValue={initial.materials ?? ""} rows={2} wrapperClassName="sm:col-span-2" />
              </FormSection>

              <FormSection title={t("schedule")}>
                <Select name="dayOfWeek" label={t("dayOfWeek")} defaultValue={initial.dayOfWeek != null ? String(initial.dayOfWeek) : ""} placeholder={t("noRecurrence")} options={[1, 2, 3, 4, 5, 6, 0].map((d) => ({ value: String(d), label: tc(`enums.weekday.${d}`) }))} />
                <Input name="startTime" type="time" label={t("startTime")} defaultValue={initial.startTime ?? ""} dir="ltr" />
                <Input name="startDate" type="date" label={t("startDate")} defaultValue={toDateInput(initial.startDate)} />
                <Input name="endDate" type="date" label={t("endDate")} defaultValue={toDateInput(initial.endDate)} />
                <Input name="schedule" label={t("scheduleText")} hint={t("scheduleHint")} defaultValue={initial.schedule ?? ""} wrapperClassName="sm:col-span-2" />
              </FormSection>
            </div>

            <div className="space-y-5">
              <section className="card space-y-4 p-5 sm:p-6">
                <h2 className="text-lg font-bold text-ink">{t("organisation")}</h2>
                <Select name="status" label={tc("fields.status")} defaultValue={initial.status ?? "ACTIVE"} options={ACTIVITY_STATUSES.map((s) => ({ value: s, label: tc(`status.${s}`) }))} />
                <Input name="capacity" type="number" min={1} label={tc("fields.capacity")} defaultValue={initial.capacity ?? 20} required />
                <Select name="monitorId" label={tc("fields.monitor")} defaultValue={initial.monitorId ?? ""} placeholder="—" options={monitors.map((m) => ({ value: m.id, label: m.name }))} />
                <Select name="groupId" label={tc("fields.group")} defaultValue={initial.groupId ?? ""} placeholder={t("noGroup")} options={groups.map((g) => ({ value: g.id, label: g.name }))} />
                <Select name="eventId" label={t("event")} defaultValue={initial.eventId ?? ""} placeholder={t("noEvent")} options={events.map((e) => ({ value: e.id, label: e.name }))} />
                <Checkbox name="isPublic" label={tc("fields.public")} defaultChecked={initial.isPublic ?? true} />
              </section>
              <section className="card p-5 sm:p-6">
                <Upload name="coverUrl" kind="image" label={tc("fields.cover")} defaultValue={initial.coverUrl} />
                <p className="mt-2 text-xs text-muted">{t("coverHint")}</p>
              </section>
            </div>
          </div>

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

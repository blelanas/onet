import { useTranslations } from "use-intl";
import { useState } from "react";
import { Check } from "lucide-react";
import { saveGroup } from "@/api/groups";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { GROUP_COLORS, GROUP_ICONS } from "./constants";
import { GroupIcon } from "./group-icon";

export type GroupFormValues = {
  id?: string;
  name?: string;
  description?: string | null;
  color?: string;
  icon?: string;
  ageMin?: number | null;
  ageMax?: number | null;
  capacity?: number;
  meetingDay?: number | null;
  meetingTime?: string | null;
  schedule?: string | null;
  location?: string | null;
  isActive?: boolean;
};

function FormSection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("card p-5 sm:p-6", className)}>
      <h2 className="mb-4 text-lg font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function GroupForm({ initial }: { initial: GroupFormValues }) {
  const t = useTranslations("groups.form");
  const tc = useTranslations("common");
  const [name, setName] = useState(initial.name ?? "");
  const [color, setColor] = useState<string>(initial.color && (GROUP_COLORS as readonly string[]).includes(initial.color) ? initial.color : GROUP_COLORS[6]);
  const [icon, setIcon] = useState<string>(initial.icon ?? "star");

  return (
    <ActionForm action={saveGroup} successMessage={initial.id ? "toast.saved" : "toast.created"} redirectTo={(d) => `/dashboard/groups/${d?.id}`} className="grid gap-5 lg:grid-cols-3">
      {(pending) => (
        <>
          {initial.id && <input type="hidden" name="id" value={initial.id} />}
          <div className="space-y-5 lg:col-span-2">
            <FormSection title={t("identity")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="name" label={tc("fields.name")} value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} wrapperClassName="sm:col-span-2" />
                <Textarea name="description" label={tc("fields.description")} defaultValue={initial.description ?? ""} rows={3} wrapperClassName="sm:col-span-2" />
                <Input name="ageMin" type="number" min={0} max={99} label={t("ageMin")} defaultValue={initial.ageMin ?? ""} />
                <Input name="ageMax" type="number" min={0} max={99} label={t("ageMax")} defaultValue={initial.ageMax ?? ""} />
                <Input name="capacity" type="number" min={1} label={tc("fields.capacity")} defaultValue={initial.capacity ?? 20} required hint={t("capacityHint")} />
                <div className="flex items-end pb-1">
                  <Checkbox name="isActive" label={t("isActive")} description={t("isActiveHint")} defaultChecked={initial.isActive ?? true} />
                </div>
              </div>
            </FormSection>

            <FormSection title={t("meetings")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select name="meetingDay" label={t("meetingDay")} defaultValue={initial.meetingDay != null ? String(initial.meetingDay) : ""} placeholder="—" options={[1, 2, 3, 4, 5, 6, 0].map((d) => ({ value: String(d), label: tc(`enums.weekday.${d}`) }))} />
                <Input name="meetingTime" type="time" label={t("meetingTime")} defaultValue={initial.meetingTime ?? ""} dir="ltr" />
                <Input name="schedule" label={t("schedule")} hint={t("scheduleHint")} defaultValue={initial.schedule ?? ""} />
                <Input name="location" label={tc("fields.location")} defaultValue={initial.location ?? ""} />
              </div>
            </FormSection>
          </div>

          <div className="space-y-5">
            <FormSection title={t("look")}>
              <input type="hidden" name="color" value={color} />
              <input type="hidden" name="icon" value={icon} />
              {/* Live preview */}
              <div className="mb-5 overflow-hidden rounded-2xl border border-line">
                <div className="h-14" style={{ background: `linear-gradient(135deg, ${color}, ${color}B0)` }} />
                <div className="-mt-7 flex items-end gap-3 px-4 pb-4">
                  <span className="grid size-14 place-items-center rounded-2xl border-4 border-surface text-white shadow-[var(--shadow-soft)]" style={{ background: color }}>
                    <GroupIcon icon={icon} className="size-6" />
                  </span>
                  <span className="truncate pb-1 font-display text-lg font-extrabold text-ink">{name || t("previewName")}</span>
                </div>
              </div>

              <p className="mb-2 text-sm font-bold text-ink-2">{t("color")}</p>
              <div className="mb-5 flex flex-wrap gap-2" role="radiogroup" aria-label={t("color")}>
                {GROUP_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={color === c}
                    aria-label={c}
                    onClick={() => setColor(c)}
                    className={cn("grid size-9 place-items-center rounded-full text-white transition hover:scale-110", color === c && "ring-4 ring-offset-2 ring-offset-surface")}
                    style={{ background: c, ["--tw-ring-color" as string]: `${c}55` }}
                  >
                    {color === c && <Check className="size-4" />}
                  </button>
                ))}
              </div>

              <p className="mb-2 text-sm font-bold text-ink-2">{t("icon")}</p>
              <div className="grid grid-cols-8 gap-1.5 lg:grid-cols-4 xl:grid-cols-8" role="radiogroup" aria-label={t("icon")}>
                {GROUP_ICONS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={icon === k}
                    aria-label={k}
                    onClick={() => setIcon(k)}
                    className={cn("grid aspect-square place-items-center rounded-xl border transition", icon === k ? "border-transparent text-white shadow-sm" : "border-line text-ink-2 hover:bg-surface-2")}
                    style={icon === k ? { background: color } : undefined}
                  >
                    <GroupIcon icon={k} className="size-5" />
                  </button>
                ))}
              </div>
            </FormSection>
          </div>

          <div className="sticky bottom-20 z-10 flex justify-end gap-2 rounded-2xl border border-line bg-surface/90 p-3 shadow-[var(--shadow-lift)] backdrop-blur lg:bottom-4 lg:col-span-3">
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

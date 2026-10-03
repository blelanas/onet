"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertOctagon, AlertTriangle, Info, Pencil, Plus } from "lucide-react";
import { saveAnnouncement } from "@/server/communication/announcement-actions";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ANNOUNCEMENT_PRIORITIES, AUDIENCES } from "@/lib/constants";
import { toDateInput } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type AnnouncementValues = {
  id: string;
  title: string;
  body: string;
  audience: string;
  groupId: string | null;
  priority: string;
  isPinned: boolean;
  expiresAt: Date | string | null;
};

const PRIORITY_STYLE: Record<string, { icon: typeof Info; active: string }> = {
  NORMAL: { icon: Info, active: "border-sky bg-sky-soft text-sky-700" },
  IMPORTANT: { icon: AlertTriangle, active: "border-sun bg-sun-soft text-amber-700" },
  URGENT: { icon: AlertOctagon, active: "border-brand-500 bg-brand-50 text-brand-700" },
};

/** Button + modal to create (no `initial`) or edit an announcement. */
export function AnnouncementFormButton({ initial, groups }: { initial?: AnnouncementValues; groups: { id: string; name: string }[] }) {
  const t = useTranslations("communication.announcements");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState(initial?.audience ?? "ALL");
  const [priority, setPriority] = useState(initial?.priority ?? "NORMAL");

  return (
    <>
      {initial ? (
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} aria-label={tc("actions.edit")}>
          <Pencil className="size-4" />
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> {t("new")}
        </Button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={initial ? t("edit") : t("new")} size="lg">
        <ActionForm action={saveAnnouncement} successMessage={initial ? "toast.saved" : "toast.created"} onSuccess={() => setOpen(false)} className="space-y-4">
          {(pending) => (
            <>
              {initial && <input type="hidden" name="id" value={initial.id} />}
              <Input name="title" label={t("form.title")} defaultValue={initial?.title} required maxLength={160} autoFocus />
              <Textarea name="body" label={t("form.body")} defaultValue={initial?.body} required rows={5} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select name="audience" label={t("form.audience")} value={audience} onChange={(e) => setAudience(e.target.value)} options={AUDIENCES.map((a) => ({ value: a, label: tc(`enums.audience.${a}`) }))} />
                {audience === "GROUP" ? (
                  <Select name="groupId" label={t("form.group")} defaultValue={initial?.groupId ?? ""} placeholder="—" required hint={t("form.groupHint")} options={groups.map((g) => ({ value: g.id, label: g.name }))} />
                ) : (
                  <Input name="expiresAt" type="date" label={t("form.expiresAt")} hint={t("form.expiresHint")} defaultValue={toDateInput(initial?.expiresAt)} />
                )}
              </div>
              {audience === "GROUP" && <Input name="expiresAt" type="date" label={t("form.expiresAt")} hint={t("form.expiresHint")} defaultValue={toDateInput(initial?.expiresAt)} />}
              <fieldset>
                <legend className="mb-1.5 block text-sm font-bold text-ink-2">{t("form.priority")}</legend>
                <input type="hidden" name="priority" value={priority} />
                <div className="grid grid-cols-3 gap-2">
                  {ANNOUNCEMENT_PRIORITIES.map((p) => {
                    const Icon = PRIORITY_STYLE[p].icon;
                    return (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={priority === p}
                        onClick={() => setPriority(p)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-2 text-sm font-bold transition",
                          priority === p ? PRIORITY_STYLE[p].active : "border-line bg-surface text-ink-2 hover:border-brand-200",
                        )}
                      >
                        <Icon className="size-4" /> {tc(`status.${p}`)}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="grid gap-2 rounded-2xl bg-surface-2/60 p-3 sm:grid-cols-2">
                <Checkbox name="isPinned" label={t("form.pin")} defaultChecked={initial?.isPinned} />
                <Checkbox name="notify" label={t("form.notify")} description={t("form.notifyHint")} defaultChecked={!initial} />
              </div>
              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  {tc("actions.cancel")}
                </Button>
                <Button type="submit" loading={pending}>
                  {initial ? tc("actions.save") : t("form.publish")}
                </Button>
              </div>
            </>
          )}
        </ActionForm>
      </Modal>
    </>
  );
}

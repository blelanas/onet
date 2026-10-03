"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarClock, MapPin, Plus, Trash2, Users } from "lucide-react";
import { deleteCalendarEntry, saveCalendarEntry } from "@/server/calendar/actions";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { CALENDAR_ENTRY_TYPES } from "@/lib/constants";
import { ENTRY_AUDIENCES } from "./constants";

/** Entry values pre-formatted on the server (local time strings) so inputs match stored times. */
export type EntryView = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  allDay: boolean;
  location: string | null;
  audience: string;
  startDay: string;
  endDay: string;
  startAt: string;
  endAt: string;
  whenLabel: string;
  author: string | null;
};

function EntryForm({ entry, defaultDay, onDone }: { entry?: EntryView; defaultDay: string; onDone: () => void }) {
  const t = useTranslations("calendar.entry");
  const tc = useTranslations("common");
  const [allDay, setAllDay] = useState(entry?.allDay ?? false);
  return (
    <ActionForm action={saveCalendarEntry} successMessage={entry ? "toast.saved" : "toast.created"} onSuccess={onDone} className="grid gap-4 sm:grid-cols-2">
      {(pending) => (
        <>
          {entry && <input type="hidden" name="id" value={entry.id} />}
          <Input name="title" label={tc("fields.title")} defaultValue={entry?.title} required maxLength={140} wrapperClassName="sm:col-span-2" />
          <Select name="type" label={t("type")} defaultValue={entry?.type ?? "MEETING"} options={CALENDAR_ENTRY_TYPES.map((v) => ({ value: v, label: tc(`enums.calendarType.${v}`) }))} />
          <Select name="audience" label={t("audience")} defaultValue={entry?.audience ?? "ALL"} options={ENTRY_AUDIENCES.map((v) => ({ value: v, label: tc(`enums.audience.${v}`) }))} />
          <Checkbox name="allDay" label={t("allDay")} checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="sm:col-span-2" />
          {allDay ? (
            <>
              <Input key="sd" name="startDay" type="date" label={t("start")} defaultValue={entry?.startDay ?? defaultDay} required />
              <Input key="ed" name="endDay" type="date" label={t("end")} defaultValue={entry?.endDay ?? ""} hint={tc("fields.optional")} />
            </>
          ) : (
            <>
              <Input key="st" name="startAt" type="datetime-local" label={t("start")} defaultValue={entry?.startAt ?? `${defaultDay}T18:00`} required />
              <Input key="et" name="endAt" type="datetime-local" label={t("end")} defaultValue={entry?.endAt ?? ""} hint={tc("fields.optional")} />
            </>
          )}
          <Input name="location" label={tc("fields.location")} defaultValue={entry?.location ?? ""} wrapperClassName="sm:col-span-2" />
          <Textarea name="description" label={tc("fields.description")} defaultValue={entry?.description ?? ""} rows={3} wrapperClassName="sm:col-span-2" />
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4 sm:col-span-2">
            {entry && (
              <ConfirmButton action={deleteCalendarEntry.bind(null, entry.id)} variant="ghost" size="md" className="me-auto text-red-600" title={t("deleteTitle")}>
                <Trash2 className="size-4" /> {tc("actions.delete")}
              </ConfirmButton>
            )}
            <Button variant="outline" onClick={onDone}>
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

/** "New entry" button (calendar.manage). */
export function NewEntryButton({ defaultDay }: { defaultDay: string }) {
  const t = useTranslations("calendar.entry");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" /> {t("new")}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("new")} size="lg">
        {open && <EntryForm defaultDay={defaultDay} onDone={() => setOpen(false)} />}
      </Modal>
    </>
  );
}

/** Opened by ?entry=<id>: details for everyone, edit form for managers. */
export function EntryDialog({ entry, canManage }: { entry: EntryView; canManage: boolean }) {
  const t = useTranslations("calendar.entry");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const close = () => {
    const sp = new URLSearchParams(params.toString());
    sp.delete("entry");
    router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false });
  };
  return (
    <Modal open onClose={close} title={canManage ? t("edit") : entry.title} size="lg">
      {canManage ? (
        <EntryForm entry={entry} defaultDay={entry.startDay} onDone={close} />
      ) : (
        <div className="space-y-3 text-sm">
          <span className="inline-block rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-bold text-ink-2">{tc(`enums.calendarType.${entry.type}`)}</span>
          <p className="flex items-center gap-2 font-semibold text-ink">
            <CalendarClock className="size-4 text-muted" /> {entry.whenLabel}
          </p>
          {entry.location && (
            <p className="flex items-center gap-2 text-ink-2">
              <MapPin className="size-4 text-muted" /> {entry.location}
            </p>
          )}
          <p className="flex items-center gap-2 text-ink-2">
            <Users className="size-4 text-muted" /> {tc(`enums.audience.${entry.audience}`)}
          </p>
          {entry.description && <p className="rounded-2xl bg-surface-2 p-3 whitespace-pre-line text-ink-2">{entry.description}</p>}
        </div>
      )}
    </Modal>
  );
}

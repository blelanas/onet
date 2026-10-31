import { useState } from "react";
import { useTranslations } from "use-intl";
import { CalendarPlus } from "lucide-react";
import { createEdition } from "@/api/events";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Upload } from "@/components/ui/upload";
import { DirectorSelect } from "./director-select";

type Series = { id: string; name: string; nameAr: string | null; kind: string };
export type NextEdition = {
  editionNumber: number;
  seasonYear: number;
  title: string;
  previous: { id: string; title: string; editionNumber: number | null; teamsCount: number } | null;
  /** The previous edition's director (when still eligible): proposed for the new one. */
  directorId: string | null;
};

/** Same rule as the API: "تظاهرة الطفولة 16" for a festival, "<name> 2026-2027" otherwise. */
function defaultTitle(s: Series, n: number, y: number) {
  return s.kind === "FESTIVAL" ? `${s.nameAr || s.name} ${n}` : `${s.name} ${y}-${y + 1}`;
}

/** "New edition" button + modal (admins). */
export function NewEditionButton({ series, next, size = "md" }: { series: Series; next: NextEdition; size?: "sm" | "md" }) {
  const t = useTranslations("events.edition");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size={size} onClick={() => setOpen(true)}>
        <CalendarPlus className="size-4" /> {t("new")}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("new")} description={t("newHint")} size="lg">
        <EditionForm series={series} next={next} onCancel={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function EditionForm({ series, next, onCancel }: { series: Series; next: NextEdition; onCancel: () => void }) {
  const t = useTranslations("events.edition");
  const tf = useTranslations("events.form");
  const tc = useTranslations("common");
  const td = useTranslations("events.director");
  const [number, setNumber] = useState(String(next.editionNumber));
  const [year, setYear] = useState(String(next.seasonYear));
  const [title, setTitle] = useState(next.title);
  const [touched, setTouched] = useState(false);
  // The suggested title follows the number / year until the user edits it.
  const sync = (n: string, y: string) => {
    if (!touched && Number(n) > 0 && Number(y) > 1900) setTitle(defaultTitle(series, Number(n), Number(y)));
  };
  return (
    <ActionForm action={createEdition} successMessage="toast.created" redirectTo={(d) => `/dashboard/events/${d?.id}`} className="flex flex-col gap-4">
      {(pending) => (
        <>
          <input type="hidden" name="seriesId" value={series.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="editionNumber"
              type="number"
              min={1}
              label={t("editionNumber")}
              value={number}
              onChange={(e) => {
                setNumber(e.target.value);
                sync(e.target.value, year);
              }}
              dir="ltr"
              required
            />
            <Input
              name="seasonYear"
              type="number"
              min={1990}
              max={2100}
              label={t("seasonYear")}
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                sync(number, e.target.value);
              }}
              dir="ltr"
              required
            />
            <Input
              name="title"
              label={tc("fields.title")}
              hint={t("titleHint")}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTouched(true);
              }}
              wrapperClassName="sm:col-span-2"
              maxLength={160}
              dir="auto"
            />
            <Input name="startAt" type="datetime-local" label={tf("startAt")} required />
            <Input name="endAt" type="datetime-local" label={tf("endAt")} required />
            <Input name="location" label={tc("fields.location")} wrapperClassName="sm:col-span-2" />
          </div>
          <DirectorSelect defaultValue={next.directorId} hint={next.directorId ? `${td("hint")} ${td("hintPrevious")}` : td("hint")} />
          <Textarea name="description" label={tc("fields.description")} rows={3} />
          <Upload name="coverUrl" kind="image" label={tc("fields.cover")} />
          {next.previous && next.previous.teamsCount > 0 && (
            <Checkbox name="copyTeams" defaultChecked label={t("copyTeams", { title: next.previous.title })} description={t("copyTeamsHint", { count: next.previous.teamsCount })} />
          )}
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="outline" onClick={onCancel} disabled={pending}>
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" loading={pending}>
              {tc("actions.create")}
            </Button>
          </div>
        </>
      )}
    </ActionForm>
  );
}

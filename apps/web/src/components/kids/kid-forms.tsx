import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "use-intl";
import { Loader2, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { kidCandidatesPage } from "@api/modules/kids/queries";
import { GENDERS, GUARDIAN_RELATIONS, toDateInput } from "@onet/shared";
import type { ActionResult } from "@/lib/api";
import { useApi, refreshAll } from "@/lib/query";
import type { Loaded } from "@/lib/types";
import { cn } from "@/lib/utils";
import { addExistingKid, addKid, updateKid } from "@/api/kids";
import { ActionForm } from "@/components/ui/action-form";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, inputClasses } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Upload } from "@/components/ui/upload";

type TeamOption = { id: string; name: string };

export type KidFormValues = {
  id?: string;
  firstName?: string;
  lastName?: string;
  firstNameAr?: string | null;
  lastNameAr?: string | null;
  dateOfBirth?: Date | null;
  gender?: string | null;
  photoUrl?: string | null;
  medicalNotes?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  parentRelation?: string | null;
  parentLocked?: boolean;
};

/** Kid card fields shared by "new kid" and "edit card". */
function KidFields({ initial = {}, withArabic }: { initial?: KidFormValues; withArabic?: boolean }) {
  const t = useTranslations("kids.add");
  const tk = useTranslations("kids");
  const tc = useTranslations("common");
  return (
    <>
      <section className="space-y-4">
        <h3 className="text-sm font-extrabold tracking-wide text-muted uppercase">{t("kidSection")}</h3>
        <Upload name="photoUrl" kind="image" label={t("photo")} defaultValue={initial.photoUrl} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="firstName" label={t("firstName")} defaultValue={initial.firstName} required maxLength={80} autoComplete="off" />
          <Input name="lastName" label={t("lastName")} defaultValue={initial.lastName} required maxLength={80} autoComplete="off" />
          {withArabic && (
            <>
              <Input name="firstNameAr" label={t("firstNameAr")} defaultValue={initial.firstNameAr ?? ""} dir="rtl" lang="ar" maxLength={80} />
              <Input name="lastNameAr" label={t("lastNameAr")} defaultValue={initial.lastNameAr ?? ""} dir="rtl" lang="ar" maxLength={80} />
            </>
          )}
          <Input name="dateOfBirth" type="date" label={t("birthDate")} defaultValue={toDateInput(initial.dateOfBirth)} max={toDateInput(new Date())} required />
          <Select name="gender" label={t("gender")} defaultValue={initial.gender ?? ""} placeholder="—" options={GENDERS.map((g) => ({ value: g, label: tc(`enums.gender.${g}`) }))} />
        </div>
        <Textarea name="medicalNotes" label={t("medicalNotes")} defaultValue={initial.medicalNotes ?? ""} rows={2} />
      </section>
      <section className="space-y-4 border-t border-line pt-4">
        <div>
          <h3 className="text-sm font-extrabold tracking-wide text-muted uppercase">{t("parentSection")}</h3>
          <p className="mt-0.5 text-xs text-muted">{initial.parentLocked ? tk("edit.parentLocked") : t("parentHint")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="parentName" label={t("parentName")} defaultValue={initial.parentName ?? ""} required={!initial.id} disabled={initial.parentLocked} maxLength={160} autoComplete="off" />
          <Input name="parentPhone" type="tel" inputMode="tel" label={t("parentPhone")} defaultValue={initial.parentPhone ?? ""} required={!initial.id} disabled={initial.parentLocked} dir="ltr" placeholder="+216 …" autoComplete="off" />
          <Select name="parentRelation" label={t("relation")} defaultValue={initial.parentRelation ?? "PARENT"} options={GUARDIAN_RELATIONS.map((r) => ({ value: r, label: tc(`enums.relation.${r}`) }))} />
        </div>
      </section>
    </>
  );
}

/**
 * "Add a kid" button + modal: a kid ONET already knows (search) or a new kid with the parent contact.
 * `teams`: the teams the kid may be put into; `requireTeam` (team leaders): one of them must be chosen.
 */
export function AddKidButton({ eventId, teams, requireTeam = false }: { eventId: string; teams: TeamOption[]; requireTeam?: boolean }) {
  const t = useTranslations("kids.add");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="size-4" /> {t("button")}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("title")} size="lg">
        {open && <AddKid eventId={eventId} teams={teams} requireTeam={requireTeam} onDone={() => setOpen(false)} />}
      </Modal>
    </>
  );
}

function AddKid({ eventId, teams, requireTeam, onDone }: { eventId: string; teams: TeamOption[]; requireTeam: boolean; onDone: () => void }) {
  const t = useTranslations("kids.add");
  const tk = useTranslations("kids");
  const tc = useTranslations("common");
  const [mode, setMode] = useState<"existing" | "new">("existing");
  // A leader adds kids into one of the teams they lead: preselected, never "no team".
  const [teamId, setTeamId] = useState(requireTeam ? (teams[0]?.id ?? "") : "");
  const teamSelect = teams.length > 0 && (
    <Select
      label={t("team")}
      value={teamId}
      onChange={(e) => setTeamId(e.target.value)}
      placeholder={requireTeam ? undefined : t("noTeam")}
      required={requireTeam}
      hint={requireTeam ? t("teamLeaderHint") : undefined}
      options={teams.map((x) => ({ value: x.id, label: x.name }))}
    />
  );
  // The API answers errors.kidExists (kids namespace) when a "new" kid matches an existing record.
  const action = async (fd: FormData): Promise<ActionResult<{ registrationId: string; memberId: string }>> => {
    const r = await addKid(fd);
    return !r.ok && r.error === "errors.kidExists" ? { ...r, error: tk("errors.kidExists") } : r;
  };
  const tab = (key: "existing" | "new") =>
    cn("flex-1 rounded-xl px-3 py-2 text-sm font-bold transition", mode === key ? "bg-surface text-brand-700 shadow-[var(--shadow-soft)]" : "text-muted hover:text-ink");
  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-2xl bg-surface-2 p-1" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "existing"} className={tab("existing")} onClick={() => setMode("existing")}>
          {t("existing")}
        </button>
        <button type="button" role="tab" aria-selected={mode === "new"} className={tab("new")} onClick={() => setMode("new")}>
          {t("new")}
        </button>
      </div>
      {mode === "existing" ? (
        <div className="space-y-4">
          {teamSelect}
          <ExistingKidSearch eventId={eventId} teamId={teamId} />
        </div>
      ) : (
        <ActionForm action={action} successMessage={t("added")} onSuccess={onDone} className="flex flex-col gap-4">
          {(pending) => (
            <>
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="teamId" value={teamId} />
              {teamSelect}
              <KidFields />
              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <Button variant="outline" onClick={onDone} disabled={pending}>
                  {tc("actions.cancel")}
                </Button>
                <Button type="submit" loading={pending}>
                  <UserPlus className="size-4" /> {tc("actions.add")}
                </Button>
              </div>
            </>
          )}
        </ActionForm>
      )}
    </div>
  );
}

function ExistingKidSearch({ eventId, teamId }: { eventId: string; teamId: string }) {
  const t = useTranslations("kids.add");
  const tc = useTranslations("common");
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);
  const query = useApi<Loaded<typeof kidCandidatesPage>>(`/events/${eventId}/kids/candidates`, { q: debounced }, { enabled: debounced.length >= 2 });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, start] = useTransition();
  const add = (memberId: string) => {
    setPendingId(memberId);
    start(async () => {
      const r = await addExistingKid(eventId, memberId, teamId || null);
      setPendingId(null);
      if (r.ok) {
        toast.success(t("added"));
        void refreshAll();
      } else toast.error(r.error.startsWith("errors.") ? tc(r.error) : r.error);
    });
  };
  const rows = debounced.length >= 2 ? (query.data?.rows ?? []) : [];
  return (
    <div className="space-y-2">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 start-3 grid place-items-center text-muted">{query.isFetching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} className={cn(inputClasses, "ps-10")} autoFocus />
      </div>
      {debounced.length < 2 ? (
        <p className="text-xs text-muted">{t("searchHint")}</p>
      ) : rows.length ? (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {rows.map((k) => (
            <li key={k.id} className="flex items-center gap-3 px-3 py-2.5">
              <Avatar firstName={k.firstName} lastName={k.lastName} src={k.photoUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">
                  {k.firstName} {k.lastName}
                  {k.age !== null && <span className="ms-1.5 text-xs font-semibold text-muted">· {tc("fields.years", { count: k.age })}</span>}
                </p>
                <p className="truncate text-xs text-muted">
                  {[k.guardianName && t("parentOf", { name: k.guardianName }), k.lastEdition && t("lastEdition", { title: k.lastEdition.title })].filter(Boolean).join(" · ") || k.membershipNumber}
                </p>
              </div>
              <Button size="sm" variant="soft" loading={pendingId === k.id} onClick={() => add(k.id)}>
                {t("addThis")}
              </Button>
            </li>
          ))}
        </ul>
      ) : query.isFetching ? null : (
        <p className="rounded-xl bg-surface-2/60 p-3 text-sm text-muted">{t("noMatch")}</p>
      )}
    </div>
  );
}

/** Modal editing the kid card (admins and the kid's edition leaders). */
export function EditKidModal({ open, onClose, initial }: { open: boolean; onClose: () => void; initial: KidFormValues & { id: string } }) {
  const tk = useTranslations("kids");
  const tc = useTranslations("common");
  return (
    <Modal open={open} onClose={onClose} title={tk("edit.title", { name: `${initial.firstName ?? ""} ${initial.lastName ?? ""}`.trim() })} size="lg">
      {open && (
        <ActionForm key={initial.id} action={updateKid} onSuccess={onClose} className="flex flex-col gap-4">
          {(pending) => (
            <>
              <input type="hidden" name="id" value={initial.id} />
              <KidFields initial={initial} withArabic />
              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <Button variant="outline" onClick={onClose} disabled={pending}>
                  {tc("actions.cancel")}
                </Button>
                <Button type="submit" loading={pending}>
                  {tc("actions.save")}
                </Button>
              </div>
            </>
          )}
        </ActionForm>
      )}
    </Modal>
  );
}

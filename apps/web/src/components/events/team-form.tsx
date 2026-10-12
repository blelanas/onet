import { useMemo, useState } from "react";
import { useTranslations } from "use-intl";
import { MessagesSquare, Search, X } from "lucide-react";
import { saveTeam } from "@/api/events";
import { cn } from "@/lib/utils";
import { ActionForm } from "@/components/ui/action-form";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Select, inputClasses } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ColorPicker } from "./series-visuals";

export type Candidate = { id: string; firstName: string; lastName: string; photoUrl: string | null; type: string };
export type TeamFormValues = { id?: string; name?: string; color?: string; leaderId?: string | null; memberIds?: string[] };

/**
 * Team editor (modal). Admins choose everything; a team's own leader (`leaderLocked`) changes the name,
 * colour and animators. The members multi-select keeps hidden inputs for every selected person, so a
 * search filter never drops a selection.
 */
export function TeamFormModal({
  open,
  onClose,
  eventId,
  initial,
  candidates,
  leaderLocked,
  leaderName,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  initial: TeamFormValues;
  candidates: Candidate[];
  leaderLocked?: boolean;
  leaderName?: string | null;
}) {
  const t = useTranslations("events.teams");
  return (
    <Modal open={open} onClose={onClose} title={initial.id ? t("edit") : t("new")} size="lg">
      {open && <TeamForm key={initial.id ?? "new"} eventId={eventId} initial={initial} candidates={candidates} leaderLocked={leaderLocked} leaderName={leaderName} onDone={onClose} />}
    </Modal>
  );
}

function TeamForm({ eventId, initial, candidates, leaderLocked, leaderName, onDone }: { eventId: string; initial: TeamFormValues; candidates: Candidate[]; leaderLocked?: boolean; leaderName?: string | null; onDone: () => void }) {
  const t = useTranslations("events.teams");
  const tf = useTranslations("events.teams.form");
  const tc = useTranslations("common");
  const [leaderId, setLeaderId] = useState(initial.leaderId ?? "");
  const [selected, setSelected] = useState<string[]>(initial.memberIds ?? []);
  const [q, setQ] = useState("");
  const byId = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const visible = candidates.filter((c) => c.id !== leaderId && (!q.trim() || norm(`${c.firstName} ${c.lastName}`).includes(norm(q.trim()))));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const members = selected.filter((id) => id !== leaderId);

  return (
    <ActionForm action={saveTeam} successMessage={initial.id ? "toast.saved" : "toast.created"} onSuccess={onDone} className="flex flex-col gap-4">
      {(pending) => (
        <>
          <input type="hidden" name="eventId" value={eventId} />
          {initial.id && <input type="hidden" name="id" value={initial.id} />}
          {members.map((id) => (
            <input key={id} type="hidden" name="memberIds[]" value={id} />
          ))}
          <Input name="name" label={tf("name")} defaultValue={initial.name} required maxLength={80} dir="auto" />
          <ColorPicker name="color" label={tf("color")} defaultValue={initial.color} />
          {leaderLocked ? (
            <div className="space-y-1.5">
              <span className="block text-sm font-bold text-ink-2">{tf("leader")}</span>
              <p className="rounded-xl border border-line bg-surface-2/60 px-3.5 py-2.5 text-sm font-semibold text-ink">{leaderName ?? t("noLeader")}</p>
              <p className="text-xs text-muted">{tf("leaderLocked")}</p>
            </div>
          ) : (
            <Select
              name="leaderId"
              label={tf("leader")}
              value={leaderId}
              onChange={(e) => setLeaderId(e.target.value)}
              placeholder={t("noLeader")}
              options={candidates.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }))}
            />
          )}

          <fieldset className="space-y-2">
            <legend className="block text-sm font-bold text-ink-2">{tf("members")}</legend>
            <p className="text-xs text-muted">{tf("membersHint")}</p>
            {members.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-live="polite">
                {members.map((id) => {
                  const c = byId.get(id);
                  if (!c) return null;
                  return (
                    <li key={id} className="flex items-center gap-1.5 rounded-full bg-brand-50 py-0.5 ps-0.5 pe-1 text-xs font-bold text-brand-700">
                      <Avatar size="xs" firstName={c.firstName} lastName={c.lastName} src={c.photoUrl} />
                      {c.firstName} {c.lastName}
                      <button type="button" onClick={() => toggle(id)} className="rounded-full p-0.5 hover:bg-brand-100" aria-label={`${tc("actions.remove")} ${c.firstName} ${c.lastName}`}>
                        <X className="size-3" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 start-3 grid place-items-center text-muted">
                <Search className="size-4" />
              </span>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tf("search")} aria-label={tf("search")} className={cn(inputClasses, "ps-10")} />
            </div>
            <ul className="max-h-56 divide-y divide-line overflow-y-auto rounded-xl border border-line">
              {visible.length ? (
                visible.map((c) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-surface-2/60">
                      <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} className="size-4 shrink-0 accent-brand-600" />
                      <Avatar size="sm" firstName={c.firstName} lastName={c.lastName} src={c.photoUrl} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                        {c.firstName} {c.lastName}
                      </span>
                      <span className="text-xs text-muted">{tc(`enums.memberType.${c.type}`)}</span>
                    </label>
                  </li>
                ))
              ) : (
                <li className="px-3 py-4 text-center text-sm text-muted">{tf("noMatch")}</li>
              )}
            </ul>
            <p className="text-xs font-semibold text-muted">{tf("selected", { count: members.length })}</p>
          </fieldset>

          <p className="flex items-start gap-2 rounded-xl bg-sky-soft p-3 text-xs text-sky-800">
            <MessagesSquare className="mt-0.5 size-4 shrink-0" /> {tf("chatHint")}
          </p>
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

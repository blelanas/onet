import { useTranslations } from "use-intl";
import { useEffect, useState, useTransition } from "react";
import { Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { GUARDIAN_RELATIONS, toDateInput } from "@onet/shared";
import type { tripCandidatesPage } from "@api/modules/trips/routes";
import { addExistingParticipant, addTripParticipant } from "@/api/trips";
import { useApi } from "@/lib/query";
import { useRouter } from "@/lib/router";
import type { Loaded } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActionForm } from "@/components/ui/action-form";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, inputClasses } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";

type Candidate = Loaded<typeof tripCandidatesPage>["rows"][number];

/** Trip managers: add a participant — an existing kid / member (search) or a new person. */
export function AddTripParticipantButton({ tripId, className }: { tripId: string; className?: string }) {
  const t = useTranslations("trips.manage");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  return (
    <>
      <Button onClick={() => setOpen(true)} className={className}>
        <UserPlus className="size-4" /> {t("add")}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("add")} description={t("addHint")} size="lg">
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 text-sm font-bold" role="tablist">
          {(["existing", "new"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn("truncate rounded-lg px-3 py-2 transition", mode === m ? "bg-surface text-brand-700 shadow-[var(--shadow-soft)]" : "text-muted hover:text-ink")}
            >
              {t(m === "existing" ? "existing" : "newPerson")}
            </button>
          ))}
        </div>
        {open && (mode === "existing" ? <ExistingPicker tripId={tripId} /> : <NewPersonForm tripId={tripId} onDone={() => setOpen(false)} />)}
      </Modal>
    </>
  );
}

function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

function ExistingPicker({ tripId }: { tripId: string }) {
  const t = useTranslations("trips.manage");
  const tc = useTranslations("common");
  const router = useRouter();
  const [q, setQ] = useState("");
  const dq = useDebounced(q.trim());
  const query = useApi<Loaded<typeof tripCandidatesPage>>(`/trips/${tripId}/candidates`, { q: dq || undefined });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, start] = useTransition();

  const add = (c: Candidate) => {
    setPendingId(c.id);
    start(async () => {
      const res = await addExistingParticipant(tripId, c.id);
      setPendingId(null);
      if (res.ok) {
        toast.success(res.message && !res.message.startsWith("toast.") ? res.message : tc("toast.registered"));
        router.refresh();
      } else toast.error(res.error.startsWith("errors.") ? tc(res.error) : res.error);
    });
  };

  const rows = query.data?.rows ?? [];
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} className={cn(inputClasses, "ps-10")} autoFocus />
      </div>
      <ul className="max-h-[50dvh] space-y-1 overflow-y-auto" aria-live="polite">
        {query.isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}
        {!query.isLoading && rows.length === 0 && <li className="rounded-2xl bg-surface-2 p-4 text-center text-sm text-muted">{t("noCandidates")}</li>}
        {rows.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-line p-2.5">
            <Avatar firstName={c.firstName} lastName={c.lastName} src={c.photoUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-ink">
                <span className="truncate">
                  {c.firstName} {c.lastName}
                </span>
                <Badge tone={c.type === "kid" ? "warning" : "violet"} className="py-0 text-[10px]">
                  {t(`types.${c.type}`)}
                </Badge>
              </p>
              <p className="truncate text-xs text-muted">{[c.age != null && t("years", { count: c.age }), c.group, c.guardian && t("guardian", { name: c.guardian })].filter(Boolean).join(" · ")}</p>
            </div>
            <Button size="sm" variant="soft" loading={pendingId === c.id} disabled={!!pendingId} onClick={() => add(c)} aria-label={`${t("choose")} — ${c.firstName} ${c.lastName}`}>
              {pendingId !== c.id && <UserPlus className="size-4" />} <span className="hidden sm:inline">{t("choose")}</span>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewPersonForm({ tripId, onDone }: { tripId: string; onDone: () => void }) {
  const t = useTranslations("trips.manage");
  const tc = useTranslations("common");
  return (
    <ActionForm action={addTripParticipant} successMessage="toast.registered" onSuccess={onDone} className="space-y-4">
      {(pending) => (
        <>
          <input type="hidden" name="tripId" value={tripId} />
          <p className="text-xs text-muted">{t("newHint")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input name="firstName" label={t("firstName")} required maxLength={80} autoComplete="off" />
            <Input name="lastName" label={t("lastName")} required maxLength={80} autoComplete="off" />
            <Input name="dateOfBirth" type="date" label={t("dateOfBirth")} required max={toDateInput(new Date())} />
            <Input name="phone" type="tel" label={t("phone")} dir="ltr" autoComplete="off" maxLength={30} />
          </div>
          <fieldset className="space-y-3 rounded-2xl border border-line p-4">
            <legend className="px-1 text-sm font-bold text-ink-2">{t("parentSection")}</legend>
            <p className="text-xs text-muted">{t("parentHint")}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="parentName" label={t("parentName")} maxLength={120} autoComplete="off" wrapperClassName="sm:col-span-2" />
              <Input name="parentPhone" type="tel" label={t("parentPhone")} dir="ltr" autoComplete="off" maxLength={30} />
              <Select name="parentRelation" label={t("parentRelation")} defaultValue="PARENT" options={GUARDIAN_RELATIONS.map((r) => ({ value: r, label: tc(`enums.relation.${r}`) }))} />
            </div>
          </fieldset>
          <Input name="notes" label={t("notes")} maxLength={500} />
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="outline" onClick={onDone}>
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" loading={pending}>
              <UserPlus className="size-4" /> {tc("actions.add")}
            </Button>
          </div>
        </>
      )}
    </ActionForm>
  );
}

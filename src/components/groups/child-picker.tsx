"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

export type PickerChild = { id: string; firstName: string; lastName: string; photoUrl: string | null; age: number | null; group: { name: string; color: string } | null };

function norm(s: string) {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Modal with an instant search over candidate children. `action` is a server action already
 * bound to its context (group/activity); capacity and scope are enforced server-side.
 */
export function ChildPicker({
  action,
  candidates,
  full,
  ageMin,
  ageMax,
  labels,
}: {
  action: (childId: string) => Promise<ActionResult<unknown>>;
  candidates: PickerChild[];
  full: boolean;
  ageMin: number | null;
  ageMax: number | null;
  labels: { button: string; title: string; hint?: string; success: string };
}) {
  const t = useTranslations("groups.members");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [onlyAge, setOnlyAge] = useState(ageMin != null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  const list = useMemo(() => {
    const terms = norm(q).split(/\s+/).filter(Boolean);
    return candidates
      .filter((c) => !onlyAge || c.age == null || ((ageMin == null || c.age >= ageMin) && (ageMax == null || c.age <= ageMax)))
      .filter((c) => terms.every((term) => norm(`${c.firstName} ${c.lastName}`).includes(term)))
      .slice(0, 60);
  }, [q, candidates, onlyAge, ageMin, ageMax]);

  const add = (id: string) => {
    setBusy(id);
    start(async () => {
      const res = await action(id);
      setBusy(null);
      if (res.ok) {
        toast.success(labels.success);
        router.refresh();
      } else toast.error(tc(res.error));
    });
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} disabled={full} title={full ? tc("errors.capacityFull") : undefined}>
        <UserPlus className="size-4" /> {labels.button}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={labels.title} description={labels.hint} size="md">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchChild")} aria-label={t("searchChild")} className={`${inputClasses} ps-10`} />
        </div>
        {ageMin != null && (
          <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-2">
            <input type="checkbox" checked={onlyAge} onChange={(e) => setOnlyAge(e.target.checked)} className="size-4 accent-brand-600" />
            {t("onlyAge")}
          </label>
        )}
        {list.length ? (
          <ul className="max-h-[50dvh] divide-y divide-line overflow-y-auto rounded-2xl border border-line">
            {list.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                <Avatar firstName={c.firstName} lastName={c.lastName} src={c.photoUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">
                    {c.firstName} {c.lastName}
                  </p>
                  <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    {c.age != null && tc("fields.years", { count: c.age })}
                    {c.group ? <Badge color={c.group.color}>{c.group.name}</Badge> : <span>· {t("noGroup")}</span>}
                  </p>
                </div>
                <Button size="sm" variant="soft" onClick={() => add(c.id)} disabled={!!busy} aria-label={`${tc("actions.add")} ${c.firstName}`}>
                  {busy === c.id ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  <span className="hidden sm:inline">{tc("actions.add")}</span>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-surface-2 p-6 text-center text-sm text-muted">{tc("states.noResults")}</p>
        )}
      </Modal>
    </>
  );
}

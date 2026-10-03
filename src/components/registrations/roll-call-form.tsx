"use client";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCheck, Search } from "lucide-react";
import type { ActionResult } from "@/lib/actions";
import { ATTENDANCE_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ActionForm } from "@/components/ui/action-form";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/input";

export type RollCallEntry = { memberId: string; firstName: string; lastName: string; photoUrl: string | null; note?: string | null; status?: string };

const TONE: Record<string, string> = {
  PRESENT: "peer-checked:bg-leaf peer-checked:text-white",
  LATE: "peer-checked:bg-sun peer-checked:text-ink",
  ABSENT: "peer-checked:bg-red-600 peer-checked:text-white",
  EXCUSED: "peer-checked:bg-sky peer-checked:text-white",
};

/** Check-in / roll-call sheet: one segmented control per participant, saved in one go. */
export function RollCallForm({ action, targetId, entries }: { action: (fd: FormData) => Promise<ActionResult<unknown>>; targetId: string; entries: RollCallEntry[] }) {
  const t = useTranslations("events");
  const tc = useTranslations("common");
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(entries.map((e) => [e.memberId, e.status ?? ""])));
  const [q, setQ] = useState("");
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const v of Object.values(values)) if (v) c[v] = (c[v] ?? 0) + 1;
    return c;
  }, [values]);
  const done = Object.values(values).filter(Boolean).length;
  const matches = (e: RollCallEntry) => !q || `${e.firstName} ${e.lastName}`.toLowerCase().includes(q.toLowerCase());

  return (
    <ActionForm action={action} successMessage="toast.saved" className="space-y-4">
      {(pending) => (
        <>
          <input type="hidden" name="id" value={targetId} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tc("actions.search")} aria-label={tc("actions.search")} className={cn(inputClasses, "ps-10")} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold sm:ms-auto">
              {ATTENDANCE_STATUSES.map((s) => (
                <span key={s} className="rounded-full bg-surface-2 px-2.5 py-1 text-ink-2">
                  {tc(`status.${s}`)} · {counts[s] ?? 0}
                </span>
              ))}
              <Button variant="soft" size="sm" onClick={() => setValues(Object.fromEntries(entries.map((e) => [e.memberId, values[e.memberId] || "PRESENT"])))}>
                <CheckCheck className="size-4" /> {t("rollCall.allPresent")}
              </Button>
            </div>
          </div>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {entries.map((e) => (
              <li key={e.memberId} hidden={!matches(e)} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-4 sm:px-4">
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar firstName={e.firstName} lastName={e.lastName} src={e.photoUrl} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-ink">
                      {e.firstName} {e.lastName}
                    </span>
                    {e.note && <span className="block truncate text-xs text-muted">{e.note}</span>}
                  </span>
                </span>
                <div role="radiogroup" aria-label={`${e.firstName} ${e.lastName}`} className="grid grid-cols-4 gap-1 rounded-xl bg-surface-2 p-1 sm:w-[340px]">
                  {ATTENDANCE_STATUSES.map((s) => (
                    <label key={s} className="relative">
                      <input type="radio" name={`s_${e.memberId}`} value={s} checked={values[e.memberId] === s} onChange={() => setValues((v) => ({ ...v, [e.memberId]: s }))} className="peer sr-only" />
                      <span className={cn("block cursor-pointer rounded-lg px-1 py-1.5 text-center text-xs font-bold text-ink-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand-300 hover:bg-surface", TONE[s])}>{tc(`status.${s}`)}</span>
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <div className="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface/90 p-3 shadow-[var(--shadow-lift)] backdrop-blur lg:bottom-4">
            <span className="text-sm font-bold text-ink-2">{t("rollCall.progress", { done, total: entries.length })}</span>
            <Button type="submit" loading={pending} disabled={!done}>
              {tc("actions.save")}
            </Button>
          </div>
        </>
      )}
    </ActionForm>
  );
}

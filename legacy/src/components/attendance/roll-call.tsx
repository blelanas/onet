"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, CheckCheck, Clock, HeartPulse, MessageSquareText, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { saveAttendance } from "@/server/attendance/actions";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/input";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ATTENDANCE_COLORS } from "./status-style";

type Member = { id: string; firstName: string; lastName: string; photoUrl: string | null; age: number | null; medical: boolean };
type Entry = { status?: AttendanceStatus; note: string };

const ICONS = { PRESENT: Check, ABSENT: X, LATE: Clock, EXCUSED: ShieldCheck } as const;

/** Phone-first roll call: one row per child with four big status buttons + optional note. */
export function RollCall({ contextKey, date, members, initial, color }: { contextKey: string; date: string; members: Member[]; initial: Record<string, { status: string; note: string }>; color: string }) {
  const t = useTranslations("attendance.roll");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [entries, setEntries] = useState<Record<string, Entry>>(() =>
    Object.fromEntries(members.map((m) => [m.id, { status: initial[m.id]?.status as AttendanceStatus | undefined, note: initial[m.id]?.note ?? "" }])),
  );
  const [notesOpen, setNotesOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(members.map((m) => [m.id, !!initial[m.id]?.note])));
  const [dirty, setDirty] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, NONE: 0 };
    for (const m of members) c[entries[m.id]?.status ?? "NONE"]++;
    return c;
  }, [entries, members]);

  const set = (id: string, patch: Partial<Entry>) => {
    setEntries((e) => ({ ...e, [id]: { ...e[id], ...patch } }));
    setDirty(true);
  };

  const allPresent = () => {
    setEntries((e) => Object.fromEntries(members.map((m) => [m.id, { ...e[m.id], status: "PRESENT" as const }])));
    setDirty(true);
  };

  const save = () => {
    const list = members.filter((m) => entries[m.id]?.status).map((m) => ({ memberId: m.id, status: entries[m.id].status!, note: entries[m.id].note.trim() || undefined }));
    if (!list.length) {
      toast.error(t("nothing"));
      return;
    }
    start(async () => {
      const res = await saveAttendance({ contextKey, date, entries: list });
      if (res.ok) {
        toast.success(res.data?.notified ? t("savedNotified", { count: res.data.notified }) : t("saved", { count: list.length }));
        setDirty(false);
        router.refresh();
      } else toast.error(tc(res.error));
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" aria-live="polite">
          {ATTENDANCE_STATUSES.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-extrabold" style={{ background: `${ATTENDANCE_COLORS[s]}1A`, color: ATTENDANCE_COLORS[s] }}>
              {tc(`status.${s}`)} <span className="tabular-nums">{counts[s]}</span>
            </span>
          ))}
          {counts.NONE > 0 && <span className="inline-flex items-center rounded-full bg-surface-2 px-3 py-1 text-sm font-bold text-muted">{t("unmarked", { count: counts.NONE })}</span>}
        </div>
        <Button variant="success" onClick={allPresent} className="w-full sm:w-auto">
          <CheckCheck className="size-4" /> {t("allPresent")}
        </Button>
      </div>

      <ul className="space-y-2.5">
        {members.map((m, i) => {
          const e = entries[m.id];
          const st = e?.status;
          return (
            <li
              key={m.id}
              className="card animate-[var(--animate-fade-up)] overflow-hidden p-3 sm:p-4"
              style={{ animationDelay: `${Math.min(i, 12) * 25}ms`, ...(st ? { borderColor: `${ATTENDANCE_COLORS[st]}66`, boxShadow: `inset 4px 0 0 ${ATTENDANCE_COLORS[st]}` } : {}) }}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar firstName={m.firstName} lastName={m.lastName} src={m.photoUrl} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">
                      {m.firstName} {m.lastName}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-muted">
                      {m.age != null && tc("fields.years", { count: m.age })}
                      {m.medical && (
                        <span className="inline-flex items-center gap-0.5 font-bold text-red-600">
                          <HeartPulse className="size-3.5" /> {t("medical")}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotesOpen((n) => ({ ...n, [m.id]: !n[m.id] }))}
                    className={cn("grid size-10 shrink-0 place-items-center rounded-xl transition md:order-last", notesOpen[m.id] || e?.note ? "bg-sky-soft text-sky-700" : "text-muted hover:bg-surface-2")}
                    aria-label={t("note")}
                    aria-expanded={!!notesOpen[m.id]}
                  >
                    <MessageSquareText className="size-5" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5 md:w-[26rem] md:shrink-0" role="radiogroup" aria-label={`${m.firstName} ${m.lastName}`}>
                  {ATTENDANCE_STATUSES.map((s) => {
                    const I = ICONS[s];
                    const on = st === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => set(m.id, { status: s })}
                        className={cn(
                          "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-1 text-[11px] font-extrabold transition active:scale-95 sm:text-xs",
                          on ? "border-transparent text-white shadow-md" : "border-line bg-surface text-ink-2 hover:border-current",
                        )}
                        style={on ? { background: ATTENDANCE_COLORS[s] } : { color: undefined }}
                      >
                        <I className="size-5" style={on ? undefined : { color: ATTENDANCE_COLORS[s] }} />
                        <span className="truncate">{tc(`status.${s}`)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {notesOpen[m.id] && (
                <input
                  value={e?.note ?? ""}
                  onChange={(ev) => set(m.id, { note: ev.target.value })}
                  maxLength={300}
                  placeholder={t("notePlaceholder")}
                  aria-label={t("note")}
                  className={cn(inputClasses, "mt-3 py-2")}
                />
              )}
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-20 z-20 mt-5 lg:bottom-4">
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-[var(--shadow-lift)] backdrop-blur">
          <div className="hidden size-10 shrink-0 place-items-center rounded-xl text-white sm:grid" style={{ background: color }}>
            <Check className="size-5" />
          </div>
          <p className="min-w-0 flex-1 text-sm">
            <span className="block font-extrabold text-ink">{t("summary", { marked: members.length - counts.NONE, total: members.length })}</span>
            <span className="block truncate text-xs text-muted">{dirty ? t("unsaved") : t("absentNotice")}</span>
          </p>
          <Button onClick={save} loading={pending} size="lg" className="shrink-0">
            {t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

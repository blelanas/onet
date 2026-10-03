import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarCheck, Download, Percent, UserX, Users } from "lucide-react";
import type { CurrentUser } from "@/lib/auth/session";
import { intlLocale } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { addDaysLocal, dayKey, normalizeDay } from "@/server/attendance/day";
import { attendanceContexts, memberRates, sessionsFor } from "@/server/attendance/queries";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { Section } from "@/components/ui/section";
import { FilterChips } from "@/components/ui/toolbar";
import { categoryColor } from "@/components/activities/category-icon";
import { ContextBar } from "./context-bar";
import { ATTENDANCE_COLORS } from "./status-style";

const STATUSES = ["PRESENT", "LATE", "EXCUSED", "ABSENT"] as const;
const PERIODS = ["4", "8", "12", "26"];

export async function HistoryView({ user, ctxParam, weeksParam }: { user: CurrentUser; ctxParam?: string; weeksParam?: string }) {
  const t = await getTranslations("attendance");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const options = await attendanceContexts(user);
  const selected = options.find((o) => o.key === ctxParam);
  const keys = selected ? [selected.key] : options.map((o) => o.key);
  const weeks = PERIODS.includes(weeksParam ?? "") ? Number(weeksParam) : 8;
  const to = normalizeDay();
  const from = addDaysLocal(to, -weeks * 7);
  const [sessions, rates] = await Promise.all([sessionsFor(keys, from, to), memberRates(keys, from, to)]);
  const monthFmt = new Intl.DateTimeFormat(intlLocale(locale), { month: "short" });
  const byKey = new Map(options.map((o) => [o.key, o]));

  const totals = sessions.reduce(
    (a, s) => ({ ok: a.ok + (s.counts.PRESENT ?? 0) + (s.counts.LATE ?? 0), absent: a.absent + (s.counts.ABSENT ?? 0), total: a.total + s.total }),
    { ok: 0, absent: 0, total: 0 },
  );
  const exportQs = new URLSearchParams({ from: dayKey(from), to: dayKey(to), ...(selected ? { ctx: selected.key } : {}) }).toString();

  return (
    <>
      <ContextBar options={options} ctx={selected?.key ?? ""} allowAll />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips param="weeks" allLabel={t("history.weeks", { count: 8 })} options={PERIODS.filter((p) => p !== "8").map((p) => ({ value: p, label: t("history.weeks", { count: Number(p) }) }))} />
        <a href={`/api/attendance/export?${exportQs}`} className={buttonClasses("outline", "md")}>
          <Download className="size-4" /> {tc("actions.exportCsv")}
        </a>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard label={t("history.sessions")} value={sessions.length} icon={<CalendarCheck className="size-5" />} accent="sky" />
        <KpiCard label={t("history.rate")} value={totals.total ? `${Math.round((totals.ok / totals.total) * 100)}%` : "—"} icon={<Percent className="size-5" />} accent="leaf" />
        <KpiCard label={t("history.absences")} value={totals.absent} icon={<UserX className="size-5" />} accent="brand" />
        <KpiCard label={t("history.children")} value={rates.length} icon={<Users className="size-5" />} accent="grape" />
      </div>

      {sessions.length ? (
        <div className="grid gap-5 lg:grid-cols-5">
          <Section title={t("history.sessionsList")} className="lg:col-span-3">
            <ul className="space-y-2.5">
              {sessions.map((s) => {
                const o = byKey.get(s.contextKey);
                const color = o ? (o.kind === "group" ? o.color : categoryColor(o.category ?? "")) : "#7a7390";
                const ok = (s.counts.PRESENT ?? 0) + (s.counts.LATE ?? 0);
                const rate = Math.round((ok / s.total) * 100);
                return (
                  <li key={`${s.contextKey}|${s.date.toISOString()}`}>
                    <Link href={`/dashboard/attendance?ctx=${encodeURIComponent(s.contextKey)}&date=${dayKey(s.date)}`} className="block rounded-2xl border border-line p-3 transition hover:border-transparent hover:shadow-[var(--shadow-lift)]">
                      <div className="flex items-center gap-3">
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl text-center leading-none text-white" style={{ background: color }}>
                          <span>
                            <span className="block font-display text-base font-extrabold">{s.date.getDate()}</span>
                            <span className="block text-[9px] font-bold uppercase">{monthFmt.format(s.date)}</span>
                          </span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-ink">{o?.name ?? s.contextKey}</p>
                          <p className="flex flex-wrap gap-x-3 text-xs font-bold">
                            {STATUSES.map((k) =>
                              s.counts[k] ? (
                                <span key={k} style={{ color: ATTENDANCE_COLORS[k] }}>
                                  {tc(`status.${k}`)} {s.counts[k]}
                                </span>
                              ) : null,
                            )}
                          </p>
                        </div>
                        <span className={cn("font-display text-lg font-extrabold tabular-nums", rate >= 80 ? "text-emerald-600" : rate >= 60 ? "text-amber-600" : "text-red-600")}>{rate}%</span>
                      </div>
                      <div className="mt-2.5 flex h-1.5 overflow-hidden rounded-full bg-surface-2">
                        {STATUSES.map((k) => (
                          <span key={k} style={{ width: `${((s.counts[k] ?? 0) / s.total) * 100}%`, background: ATTENDANCE_COLORS[k] }} />
                        ))}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Section>
          <Section title={t("history.perChild")} className="lg:col-span-2">
            <ul className="divide-y divide-line">
              {rates.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <Avatar firstName={r.firstName} lastName={r.lastName} src={r.photoUrl} size="sm" />
                  <Link href={`/dashboard/members/${r.id}?tab=attendance`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink hover:text-brand-700">
                      {r.firstName} {r.lastName}
                    </span>
                    <span className="block text-xs text-muted">
                      {t("history.childLine", { present: (r.counts.PRESENT ?? 0) + (r.counts.LATE ?? 0), total: r.total, absent: r.counts.ABSENT ?? 0 })}
                    </span>
                  </Link>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-extrabold tabular-nums", r.rate >= 80 ? "bg-leaf-soft text-emerald-700" : r.rate >= 60 ? "bg-sun-soft text-amber-700" : "bg-red-50 text-red-700")}>{r.rate}%</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      ) : (
        <div className="card">
          <EmptyState title={t("history.empty")} description={t("history.emptyHint")} icon={<CalendarCheck className="size-4" />} />
        </div>
      )}
    </>
  );
}

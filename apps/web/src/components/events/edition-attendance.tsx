import { useTransition } from "react";
import { useLocale, useTranslations } from "use-intl";
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Crown, Eye, Loader2, Repeat } from "lucide-react";
import type { eventAttendancePage } from "@api/modules/events/attendance";
import { formatDate, formatDateTime } from "@onet/shared";
import { saveEventAttendance } from "@/api/events";
import { useApi } from "@/lib/query";
import { Link, usePathname, useRouter, useSearchParams, useSearchParamsObject } from "@/lib/router";
import type { Loaded } from "@/lib/types";
import { cn } from "@/lib/utils";
import { normalizeDay } from "@/components/attendance/day";
import { RollCall } from "@/components/attendance/roll-call";
import { ATTENDANCE_COLORS, ATTENDANCE_TEXT_COLORS } from "@/components/attendance/status-style";
import { QueryView } from "@/components/states/page-state";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClasses } from "@/components/ui/input";
import { Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";

type Data = Loaded<typeof eventAttendancePage>;
type Team = Data["teams"][number];

/** Attendance tab of an event with teams: a session picker, one roll call per team, past sessions and rates. */
export function EditionAttendance({ eventId }: { eventId: string }) {
  const sp = useSearchParamsObject();
  const query = useApi<Data>(`/events/${eventId}/attendance`, { date: sp.date });
  return (
    <QueryView query={query} skeleton={<Skeleton className="h-96 rounded-3xl" />}>
      {(data) => <AttendanceView eventId={eventId} data={data} />}
    </QueryView>
  );
}

/** "Saturday 31 October 2026" for a session key. */
function useSessionLabel() {
  const locale = useLocale();
  return (key: string, style: "long" | "medium" = "long") => formatDate(normalizeDay(key), locale, style);
}

function AttendanceView({ eventId, data }: { eventId: string; data: Data }) {
  const t = useTranslations("events.attendance");
  const tf = useTranslations("events.frequency");
  const { date, teams, sessions } = data;
  if (!date)
    return (
      <div className="card">
        <EmptyState title={t("noSessions")} icon={<CalendarDays className="size-4" />} />
      </div>
    );
  return (
    <div className="space-y-5" data-testid="event-attendance">
      <SessionBar data={data} />
      {data.future && (
        <p className="flex items-center gap-2 rounded-2xl bg-sun-soft px-4 py-3 text-sm font-semibold text-amber-800">
          <AlertTriangle className="size-4 shrink-0" /> {t("future")}
        </p>
      )}
      {teams.length === 0 ? (
        <div className="card">
          <EmptyState title={t("noTeams")} description={t("noTeamsHint")} icon={<ClipboardCheck className="size-4" />} />
        </div>
      ) : (
        <>
          {teams.length > 1 && (
            <nav aria-label={t("jump")} className="flex flex-wrap gap-2">
              {teams.map((team) => (
                <a key={team.id} href={`#team-${team.id}`} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold text-ink hover:bg-surface-2">
                  <span className="size-2.5 rounded-full" style={{ background: team.color }} />
                  <bdi>{team.name}</bdi>
                  <span className="text-xs text-muted tabular-nums">
                    {team.present}/{team.total}
                  </span>
                </a>
              ))}
            </nav>
          )}
          {teams.map((team) => (
            <TeamRollCall key={`${team.id}|${date}`} eventId={eventId} date={date} team={team} future={data.future} />
          ))}
        </>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <History data={data} />
        <Rates data={data} />
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <Repeat className="size-3.5" /> {tf(data.frequency as "ONCE")} · {tf("count", { count: sessions.length })}
      </p>
    </div>
  );
}

/** Session picker bound to ?date= (previous / next session, or any session from the list). */
function SessionBar({ data }: { data: Data }) {
  const t = useTranslations("events.attendance");
  const tc = useTranslations("attendance");
  const label = useSessionLabel();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const go = (date: string | null) => {
    if (!date) return;
    const sp = new URLSearchParams(params.toString());
    sp.set("date", date);
    start(() => router.push(`${pathname}?${sp.toString()}`, { scroll: false }));
  };
  const n = data.sessions.indexOf(data.date!) + 1;
  return (
    <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
      <div className="min-w-0 sm:flex-1">
        <p className="text-xs font-extrabold tracking-wide text-muted uppercase">{t("sessionOf", { n, total: data.sessions.length })}</p>
        <p className="truncate font-display text-lg font-extrabold text-ink">
          {label(data.date!)}
          {data.date === data.today && <span className="ms-2 rounded-full bg-brand-50 px-2 py-0.5 align-middle text-xs font-bold text-brand-700">{t("today")}</span>}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" disabled={!data.prevDate} onClick={() => go(data.prevDate)} className="grid size-12 shrink-0 place-items-center rounded-xl border border-line text-ink-2 hover:bg-surface-2 disabled:opacity-40" aria-label={tc("prevSession")}>
          <ChevronLeft className="rtl-flip size-5" />
        </button>
        <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
          <CalendarDays className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <select value={data.date!} onChange={(e) => go(e.target.value)} aria-label={t("session")} className={cn(inputClasses, "h-12 cursor-pointer ps-10 font-bold")}>
            {data.sessions.map((s) => (
              <option key={s} value={s}>
                {label(s, "medium")}
                {s === data.today ? ` · ${t("today")}` : ""}
              </option>
            ))}
          </select>
        </div>
        <button type="button" disabled={!data.nextDate} onClick={() => go(data.nextDate)} className="grid size-12 shrink-0 place-items-center rounded-xl border border-line text-ink-2 hover:bg-surface-2 disabled:opacity-40" aria-label={tc("nextSession")}>
          <ChevronRight className="rtl-flip size-5" />
        </button>
        {pending && <Loader2 className="size-5 animate-spin text-brand-600" />}
      </div>
    </div>
  );
}

function TeamRollCall({ eventId, date, team, future }: { eventId: string; date: string; team: Team; future: boolean }) {
  const t = useTranslations("events.attendance");
  const ta = useTranslations("attendance.roll");
  const locale = useLocale();
  const readOnly = !team.canRecord || future;
  return (
    <section id={`team-${team.id}`} className="scroll-mt-24 space-y-3" aria-label={team.name}>
      <div className="relative overflow-hidden rounded-3xl p-4 text-white shadow-[var(--shadow-lift)] sm:p-5" style={{ background: `linear-gradient(120deg, ${team.color}, ${team.color}C0 65%, ${team.color}90)` }}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-black/15 backdrop-blur">
            <ClipboardCheck className="size-6" />
          </span>
          <div className="min-w-0 flex-1 drop-shadow-sm">
            <h2 className="truncate font-display text-xl font-extrabold">
              <bdi>{team.name}</bdi>
            </h2>
            {team.leader && (
              <p className="flex items-center gap-1 text-sm font-semibold text-white/95">
                <Crown className="size-3.5" /> {t("leader", { name: team.leader })}
              </p>
            )}
          </div>
          <span className="rounded-2xl bg-black/20 px-3 py-1.5 text-sm font-extrabold tabular-nums backdrop-blur">{t("teamCount", { present: team.present, total: team.total })}</span>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1 text-xs font-bold backdrop-blur">
          {team.recordedAt ? (
            <>
              <CheckCircle2 className="size-4" /> {ta("recordedAt", { at: formatDateTime(team.recordedAt, locale) })}
            </>
          ) : (
            ta("notRecorded")
          )}
        </p>
      </div>
      {!team.canRecord && (
        <p className="flex items-center gap-2 text-sm font-semibold text-muted">
          <Eye className="size-4 shrink-0" /> {t("readOnly")}
        </p>
      )}
      {team.kids.length ? (
        <RollCall
          members={team.kids}
          initial={team.statuses}
          color={team.color}
          readOnly={readOnly}
          inline
          notice={t("notice")}
          onSave={(entries) => saveEventAttendance(eventId, { date, teamId: team.id, entries })}
        />
      ) : (
        <div className="card">
          <EmptyState compact title={t("emptyTeam")} />
        </div>
      )}
    </section>
  );
}

/** Past sessions, newest first, with the share of kids marked present. */
function History({ data }: { data: Data }) {
  const t = useTranslations("events.attendance.history");
  const label = useSessionLabel();
  const pathname = usePathname();
  const params = useSearchParams();
  const href = (date: string) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("date", date);
    return `${pathname}?${sp.toString()}`;
  };
  return (
    <Section title={t("title")}>
      {data.history.length ? (
        <ul className="-mx-2 max-h-96 space-y-1 overflow-y-auto px-2">
          {data.history.map((h) => {
            const pct = h.marked ? Math.round((h.present / h.marked) * 100) : 0;
            return (
              <li key={h.date}>
                <Link
                  href={href(h.date)}
                  aria-label={t("open", { date: label(h.date, "medium") })}
                  className={cn("flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2", h.date === data.date && "bg-brand-50")}
                >
                  <span className="w-28 shrink-0 text-sm font-bold text-ink">{label(h.date, "medium")}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                    <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: ATTENDANCE_COLORS.PRESENT }} />
                  </span>
                  <span className={cn("w-28 shrink-0 text-end text-xs font-bold tabular-nums", h.marked ? "text-ink-2" : "text-muted")}>{h.marked ? t("line", { present: h.present, marked: h.marked }) : t("notTaken")}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">{t("empty")}</p>
      )}
    </Section>
  );
}

/** Each kid's attendance rate over the past sessions (lowest first, kids never called last). */
function Rates({ data }: { data: Data }) {
  const t = useTranslations("events.attendance.rates");
  const color = new Map(data.teams.map((x) => [x.id, x.color]));
  const rows = [...data.rates].sort((a, b) => (a.rate ?? 101) - (b.rate ?? 101) || a.firstName.localeCompare(b.firstName));
  return (
    <Section title={t("title")}>
      <p className="-mt-2 mb-3 text-xs text-muted">{t("hint")}</p>
      {rows.length ? (
        <ul className="-mx-2 max-h-96 space-y-1 overflow-y-auto px-2">
          {rows.map((r) => {
            const tone = r.rate == null ? undefined : r.rate >= 80 ? ATTENDANCE_TEXT_COLORS.PRESENT : r.rate >= 60 ? ATTENDANCE_TEXT_COLORS.LATE : ATTENDANCE_TEXT_COLORS.ABSENT;
            return (
              <li key={r.memberId} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
                <Avatar firstName={r.firstName} lastName={r.lastName} src={r.photoUrl} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate text-sm font-bold text-ink">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: color.get(r.teamId ?? "") ?? "#7A7390" }} aria-hidden />
                    <Link href={`/dashboard/members/${r.memberId}`} className="truncate hover:text-brand-700">
                      {r.firstName} {r.lastName}
                    </Link>
                  </span>
                  <span className="block text-xs text-muted">{r.marked ? t("line", { present: r.present, marked: r.marked }) : t("none")}</span>
                </span>
                <span className="w-12 shrink-0 text-end text-sm font-extrabold tabular-nums" style={{ color: tone }}>
                  {r.rate == null ? "—" : `${r.rate}%`}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">{t("empty")}</p>
      )}
    </Section>
  );
}

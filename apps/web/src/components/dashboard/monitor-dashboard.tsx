import type { dashboardPage } from "@api/modules/dashboard/routes";
import type { Loaded } from "@/lib/types";
import { useMe } from "@/lib/auth";
import { useLocale, useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { CalendarClock, CheckCircle2, ClipboardCheck, Crown, HeartPulse, ListTodo, MapPin, Users } from "lucide-react";

import { CATEGORY_COLORS } from "@onet/shared";
import { ageFrom } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { CoverArt } from "@/components/ui/cover-art";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Section } from "@/components/ui/section";
import { GreetingHeader } from "./greeting-header";
import { TaskList } from "./task-list";
import { AgendaList, AnnouncementList, DateTile, NotificationList, ScrollStrip, StripItem, useDayLabel, hhmm } from "./widgets";

export type MonitorData = Extract<Loaded<typeof dashboardPage>, { kind: "monitor" }>["data"];


export function MonitorDashboard({ d }: { d: MonitorData }) {
  const user = useMe();
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const dayLabel = useDayLabel();
  const tripLabels = d.trips.map((x) => dayLabel(x.departAt));
  const nextLabels = d.groups.map((g) => (g.next ? dayLabel(g.next) : null));

  return (
    <div className="space-y-5 sm:space-y-6">
      <GreetingHeader name={user.name} subtitle={t("greeting.subtitle.monitor")} theme="monitor">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-bold ring-1 ring-white/30 backdrop-blur">
            <CalendarClock className="size-4" /> {t("monitor.todayCount", { count: d.todayCount })}
          </span>
          <span className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-bold ring-1 ring-white/30 backdrop-blur">
            <ListTodo className="size-4" /> {t("monitor.openTasks", { count: d.openTasks })}
          </span>
        </div>
      </GreetingHeader>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">{t("monitor.myGroups")}</h2>
          <Link href="/dashboard/groups" className="text-sm font-bold text-brand-600 hover:text-brand-700">
            {tc("actions.viewAll")}
          </Link>
        </div>
        {d.groups.length ? (
          <ScrollStrip>
            {d.groups.map((g, i) => (
              <StripItem key={g.id}>
                <div className="card h-full overflow-hidden">
                  <Link href={`/dashboard/groups/${g.id}`} className="relative block p-4 text-white" style={{ background: `linear-gradient(135deg, ${g.color}, ${g.color}CC)` }}>
                    <div className="bg-confetti absolute inset-0 opacity-40" aria-hidden />
                    <div className="relative flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-display text-xl font-extrabold">{g.name}</p>
                        <p className="text-sm text-white/85">
                          {g.ageMin != null && g.ageMax != null && (
                            <>
                              <span dir="ltr">
                                {g.ageMin}–{g.ageMax}
                              </span>{" "}
                              ·{" "}
                            </>
                          )}
                          {t("monitor.kids", { count: g._count.children })}
                        </p>
                      </div>
                      {g.isLead && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-bold">
                          <Crown className="size-3" /> {t("monitor.lead")}
                        </span>
                      )}
                    </div>
                    <Progress value={g._count.children} max={g.capacity} color="#fff" className="relative mt-3 bg-white/25" label={tc("fields.capacity")} />
                  </Link>
                  <div className="space-y-3 p-4">
                    <p className="flex items-center gap-2 text-sm text-ink-2">
                      <CalendarClock className="size-4 text-muted" />
                      <span className="font-bold">{t("monitor.nextMeeting")} :</span> {g.next ? `${nextLabels[i]} · ${hhmm(g.next, locale)}` : (g.schedule ?? "—")}
                    </p>
                    {g.location && (
                      <p className="flex items-center gap-2 truncate text-sm text-muted">
                        <MapPin className="size-4 shrink-0" /> {g.location}
                      </p>
                    )}
                    <Link href={`/dashboard/attendance?group=${g.id}`} className={buttonClasses("soft", "sm", "w-full")}>
                      <ClipboardCheck className="size-4" /> {t("monitor.takeAttendance")}
                    </Link>
                  </div>
                </div>
              </StripItem>
            ))}
          </ScrollStrip>
        ) : (
          <div className="card">
            <EmptyState compact title={t("monitor.noGroups")} icon={<Users className="size-4" />} />
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Section title={t("monitor.sessions")} href="/dashboard/calendar" actionLabel={tn("items.calendar")} className="lg:col-span-2">
          <AgendaList
            items={d.sessions}
            empty={t("monitor.noSessions")}
            cta={(s) =>
              s.groupId && (s as (typeof d.sessions)[number]).isToday ? (
                (s as (typeof d.sessions)[number]).recorded ? (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-leaf-soft px-2.5 py-1.5 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="size-3.5" /> <span className="hidden sm:inline">{t("monitor.recorded")}</span>
                  </span>
                ) : (
                  <Link href={`/dashboard/attendance?group=${s.groupId}`} className={buttonClasses("primary", "sm")}>
                    <ClipboardCheck className="size-4" /> <span className="hidden sm:inline">{t("monitor.takeAttendance")}</span>
                  </Link>
                )
              ) : s.groupId ? (
                <Link href={`/dashboard/attendance?group=${s.groupId}`} className={buttonClasses("ghost", "icon-sm")} aria-label={t("monitor.takeAttendance")}>
                  <ClipboardCheck className="size-4" />
                </Link>
              ) : null
            }
          />
        </Section>
        <Section title={t("monitor.tasks")}>
          <TaskList tasks={d.tasks} />
        </Section>
      </div>

      <Section title={`${t("monitor.children")} · ${d.children.length}`} href="/dashboard/children" actionLabel={tc("actions.viewAll")}>
        {d.children.length ? (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
            {d.children.slice(0, 16).map((c) => (
              <li key={c.id}>
                <Link href={`/dashboard/members/${c.id}`} className="relative flex flex-col items-center gap-1.5 rounded-2xl p-2 text-center hover:bg-surface-2/70">
                  <span className="relative">
                    <Avatar firstName={c.firstName} lastName={c.lastName} src={c.photoUrl} size="lg" />
                    <span className="absolute -end-0.5 -bottom-0.5 size-4 rounded-full ring-2 ring-surface" style={{ background: c.group?.color }} aria-hidden />
                    {c.medicalNotes && (
                      <span className="absolute -start-1 -top-1 grid size-5 place-items-center rounded-full bg-red-600 text-white ring-2 ring-surface" title={t("monitor.medical")}>
                        <HeartPulse className="size-3" />
                        <span className="sr-only">{t("monitor.medical")}</span>
                      </span>
                    )}
                  </span>
                  <span className="w-full truncate text-xs font-bold text-ink">{c.firstName}</span>
                  {c.dateOfBirth && <span className="-mt-1 text-[11px] text-muted">{tc("fields.years", { count: ageFrom(c.dateOfBirth) ?? 0 })}</span>}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted">{tc("states.empty")}</p>
        )}
      </Section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Section title={t("monitor.trips")} href="/dashboard/trips" actionLabel={tc("actions.viewAll")}>
          {d.trips.length ? (
            <ul className="space-y-3">
              {d.trips.map((trip, ti) => (
                <li key={trip.id}>
                  <Link href={`/dashboard/trips/${trip.id}`} className="card-hover flex items-center gap-3 overflow-hidden rounded-2xl border border-line">
                    <CoverArt src={trip.coverUrl} seed={trip.id} color={CATEGORY_COLORS[trip.category] ?? "#1E9BD7"} className="h-20 w-24 shrink-0" />
                    <div className="min-w-0 flex-1 py-2 pe-3">
                      <p className="truncate font-bold text-ink">{trip.title}</p>
                      <p className="truncate text-xs text-muted">
                        {trip.destination} · {tripLabels[ti]}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={trip._count.registrations} max={trip.capacity} color="#1E9BD7" className="h-1.5" />
                        <span className="shrink-0 text-[11px] font-bold text-muted">{t("monitor.registered", { count: trip._count.registrations, capacity: trip.capacity })}</span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl bg-surface-2/60 px-4 py-6 text-center text-sm text-muted">{t("monitor.noTrips")}</p>
          )}
        </Section>
        <Section title={t("monitor.events")} href="/dashboard/events" actionLabel={tc("actions.viewAll")}>
          {d.events.length ? (
            <ul className="space-y-2">
              {d.events.map((e) => (
                <li key={e.id}>
                  <Link href={`/dashboard/events/${e.id}`} className="flex items-center gap-3 rounded-2xl p-1.5 hover:bg-surface-2/60">
                    <DateTile date={e.startAt} color={CATEGORY_COLORS[e.category]} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink">{e.title}</span>
                      <span className="block truncate text-xs text-muted">
                        {tc(`enums.eventCategory.${e.category}`)} · {hhmm(e.startAt, locale)} {e.location && `· ${e.location}`}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl bg-surface-2/60 px-4 py-6 text-center text-sm text-muted">{t("empty.agenda")}</p>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Section title={t("sections.announcements")} href="/dashboard/announcements" actionLabel={tc("actions.viewAll")}>
          <AnnouncementList items={d.announcements} empty={t("empty.announcements")} />
        </Section>
        <Section title={t("sections.notifications")} href="/dashboard/notifications" actionLabel={tc("actions.viewAll")}>
          <NotificationList items={d.notifications} empty={t("empty.notifications")} />
        </Section>
      </div>
    </div>
  );
}

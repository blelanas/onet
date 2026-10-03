import type { dashboardPage } from "@api/modules/dashboard/routes";
import type { Loaded } from "@/lib/types";
import { useMe } from "@/lib/auth";
import { useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { ArrowRight, Bus, Check, Gamepad2, Music, PartyPopper, Play, Star, Users } from "lucide-react";
import { CATEGORY_COLORS } from "@onet/shared";
import { Avatar } from "@/components/ui/avatar";
import { CoverArt } from "@/components/ui/cover-art";
import { Progress } from "@/components/ui/progress";
import { Section } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import { BadgeMedal } from "./badge-icon";
import { levelFor } from "./levels";
import { WeekSchedule } from "./week-schedule";
import { AnnouncementList, ScrollStrip, StripItem, useDayLabel } from "./widgets";

export type KidData = Extract<Loaded<typeof dashboardPage>, { kind: "kid" }>["data"];


/** Playful, safe dashboard for child accounts: no prices, no other children's data. */
export function KidDashboard({ d }: { d: KidData }) {
  const user = useMe();
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const points = d.me?.points ?? user.points;
  const lv = levelFor(points);
  const first = d.me?.firstName ?? user.name.split(" ")[0];
  const dayLabel = useDayLabel();
  const eventLabels = d.events.map((e) => dayLabel(e.startAt));
  const tripLabels = d.trips.map((r) => dayLabel(r.trip.departAt));

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero */}
      <header className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-sun via-[#ff9a3c] to-coral p-5 text-ink shadow-[var(--shadow-lift)] sm:p-7 rtl:bg-gradient-to-bl">
        <div className="bg-confetti absolute inset-0 -z-10 opacity-80" aria-hidden />
        <svg className="absolute -end-8 -top-10 -z-10 size-48 animate-[var(--animate-float)] opacity-30" viewBox="0 0 100 100" aria-hidden>
          <path d="M50 5l13 28 30 3-23 20 7 30-27-16-27 16 7-30L7 36l30-3z" fill="#fff" />
        </svg>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar firstName={first} lastName={d.me?.lastName} src={d.me?.photoUrl ?? user.avatarUrl} size="xl" ring className="shadow-lg" />
            <div>
              <h1 className="text-3xl leading-tight font-extrabold text-ink sm:text-4xl">{t.rich("greeting.kid", { name: first, n: (c) => <bdi>{c}</bdi> })}</h1>
              <p className="mt-1 font-semibold text-ink/75">{t("greeting.subtitle.kid")}</p>
              {d.me?.group && (
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-bold" style={{ color: d.me.group.color }}>
                  <Users className="size-3.5" /> {d.me.group.name}
                </span>
              )}
            </div>
          </div>
          <Link href="/dashboard/achievements" className="group block rounded-3xl bg-white/85 p-4 shadow-[var(--shadow-soft)] backdrop-blur transition hover:bg-white md:w-80">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold tracking-wide uppercase" style={{ color: lv.color }}>
                  {t("kid.level", { level: lv.level })}
                </p>
                <p className="font-display text-xl font-extrabold text-ink">{t(`levels.names.${lv.nameKey}`)}</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl bg-sun-soft px-3 py-1.5 text-amber-700">
                <Star className="size-5" fill="currentColor" />
                <span className="font-display text-2xl font-extrabold tabular-nums">{points}</span>
              </div>
            </div>
            <Progress value={lv.pct} color={lv.color} className="mt-3 h-3" label={t("achievements.progress")} />
            <p className="mt-2 text-xs font-bold text-ink-2">{t("kid.toNext", { count: lv.toNext, level: lv.level + 1 })}</p>
          </Link>
        </div>
      </header>

      {/* Badges */}
      <Section title={t("kid.badges")} href="/dashboard/achievements" actionLabel={t("kid.seeAll")}>
        <p className="-mt-3 mb-3 text-sm font-bold text-muted">{t("kid.badgesCount", { earned: d.badges.earned.length, total: d.badges.all.length })}</p>
        {d.badges.earned.length ? (
          <ul className="scrollbar-none -mx-1 flex gap-4 overflow-x-auto px-1 pb-1">
            {d.badges.earned.map((b) => (
              <li key={b.badge.id} className="flex w-20 shrink-0 animate-[var(--animate-pop)] flex-col items-center gap-1.5 text-center">
                <BadgeMedal icon={b.badge.icon} color={b.badge.color} />
                <span className="text-xs leading-tight font-bold text-ink-2">{b.badge.name}</span>
              </li>
            ))}
            {d.badges.all
              .filter((b) => !d.badges.earned.some((e) => e.badge.id === b.id))
              .slice(0, 2)
              .map((b) => (
                <li key={b.id} className="flex w-20 shrink-0 flex-col items-center gap-1.5 text-center opacity-70">
                  <BadgeMedal icon={b.icon} color={b.color} locked />
                  <span className="text-xs leading-tight font-bold text-muted">{b.name}</span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-sun-soft px-4 py-6 text-center text-sm font-bold text-amber-800">{t("kid.noBadges")}</p>
        )}
      </Section>

      {/* My week */}
      <Section title={t("kid.week")}>
        <WeekSchedule sessions={d.sessions} empty={t("kid.noWeek")} />
      </Section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Section title={t("kid.events")} href="/dashboard/events" actionLabel={tc("actions.viewAll")}>
          {d.events.length ? (
            <ul className="grid grid-cols-2 gap-3">
              {d.events.map((e, i) => (
                <li key={e.id}>
                  <Link href={`/dashboard/events/${e.id}`} className="card-hover block overflow-hidden rounded-2xl border border-line">
                    <CoverArt src={e.coverUrl} seed={e.id} color={CATEGORY_COLORS[e.category] ?? "#E8457C"} icon={<PartyPopper />} className="h-20" />
                    <div className="p-2.5">
                      <p className="line-clamp-2 text-sm leading-tight font-bold text-ink">{e.title}</p>
                      <p className="mt-1 text-xs font-bold text-muted">{eventLabels[i]}</p>
                      {e.registrations[0] && e.registrations[0].status !== "CANCELLED" && (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                          <Check className="size-3.5" /> {t("kid.registered")}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl bg-surface-2/60 px-4 py-6 text-center text-sm text-muted">{t("empty.agenda")}</p>
          )}
        </Section>
        <Section title={t("kid.trips")} href="/dashboard/trips" actionLabel={tc("actions.viewAll")}>
          {d.trips.length ? (
            <ul className="space-y-3">
              {d.trips.map((r, i) => (
                <li key={r.trip.id}>
                  <Link href={`/dashboard/trips/${r.trip.id}`} className="card-hover flex items-center gap-3 overflow-hidden rounded-2xl border border-line">
                    <CoverArt src={r.trip.coverUrl} seed={r.trip.id} color={CATEGORY_COLORS[r.trip.category] ?? "#1E9BD7"} icon={<Bus />} className="h-20 w-24 shrink-0 [&_svg]:!size-8" />
                    <div className="min-w-0 flex-1 pe-3">
                      <p className="truncate font-bold text-ink">{r.trip.title}</p>
                      <p className="truncate text-xs text-muted">
                        {r.trip.destination} · {tripLabels[i]}
                      </p>
                      <StatusBadge status={r.status} className="mt-1.5" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl bg-surface-2/60 px-4 py-6 text-center text-sm text-muted">{t("kid.noTrips")}</p>
          )}
        </Section>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
            <Music className="size-5 text-[#E8457C]" /> {t("kid.songs")}
          </h2>
          <Link href="/dashboard/content/songs" className="text-sm font-bold text-brand-600">
            {tc("actions.viewAll")}
          </Link>
        </div>
        <ScrollStrip cols="sm:grid-cols-2 lg:grid-cols-4">
          {d.songs.map((s) => (
            <StripItem key={s.id} className="w-[46%]">
              <Link href={`/dashboard/content/songs/${s.id}`} className="group card card-hover block overflow-hidden">
                <CoverArt src={s.coverUrl} seed={s.id} color={CATEGORY_COLORS[s.category] ?? "#E8457C"} icon={<Music />} className="aspect-square sm:aspect-[4/3]">
                  <span className="absolute end-2 bottom-2 grid size-10 place-items-center rounded-full bg-white text-brand-600 shadow-lg transition group-hover:scale-110">
                    <Play className="size-5 translate-x-0.5 rtl:-translate-x-0.5" fill="currentColor" />
                  </span>
                </CoverArt>
                <div className="p-3">
                  <p className="truncate text-sm font-bold text-ink">{s.title}</p>
                  <p className="truncate text-xs text-muted">{tc(`enums.songCategory.${s.category}`)}</p>
                </div>
              </Link>
            </StripItem>
          ))}
        </ScrollStrip>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Section title={t("kid.games")} href="/dashboard/content/games" actionLabel={tc("actions.viewAll")} className="lg:col-span-3">
          <ul className="space-y-2">
            {d.games.map((g) => (
              <li key={g.id}>
                <Link href={`/dashboard/content/games/${g.id}`} className="group flex items-center gap-3 rounded-2xl p-2 hover:bg-surface-2/70">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl text-white" style={{ background: CATEGORY_COLORS[g.category] ?? "#FFB400" }}>
                    <Gamepad2 className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-ink">{g.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {tc(`enums.gameCategory.${g.category}`)} · {tc("fields.minutes", { count: g.durationMin })} · {t("kid.players", { count: g.minPlayers })}
                    </span>
                  </span>
                  <ArrowRight className="rtl-flip size-4 text-muted transition group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
        <Section title={t("kid.news")} className="lg:col-span-2">
          <AnnouncementList items={d.announcements} empty={t("empty.announcements")} tone="kid" />
        </Section>
      </div>
    </div>
  );
}

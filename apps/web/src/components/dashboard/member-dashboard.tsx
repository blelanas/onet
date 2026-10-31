import type { dashboardPage } from "@api/modules/dashboard/routes";
import type { Loaded } from "@/lib/types";
import { useLocale, useTranslations } from "use-intl";
import { ArrowRight, Backpack, Bus, CalendarRange, ClipboardList, Crown, MapPin, Megaphone, MessagesSquare, PartyPopper, ShieldCheck, Smile, Users, type LucideIcon } from "lucide-react";
import { CATEGORY_COLORS, formatDate } from "@onet/shared";
import { assetUrl } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { Link } from "@/lib/router";
import { cn } from "@/lib/utils";
import { CoverArt } from "@/components/ui/cover-art";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { AnnouncementList } from "./widgets";

export type MemberData = Extract<Loaded<typeof dashboardPage>, { kind: "member" }>["data"];

type Tile = { key: string; href: string; icon: LucideIcon; tone: string; hint?: string; badge?: number };

/** "12 oct. – 15 oct. 2026" (one date when both are the same day). */
function useRange() {
  const locale = useLocale();
  return (from: Date, to: Date) => {
    const a = formatDate(from, locale);
    const b = formatDate(to, locale);
    return a === b ? a : `${a} – ${b}`;
  };
}

/**
 * Member home (members and monitors = the animators): ONET Teboulba hero, big shortcut tiles, then my
 * groups, the editions running or coming up, the trips I manage and the latest announcements.
 */
export function MemberDashboard({ d }: { d: MemberData }) {
  const me = useMe();
  const t = useTranslations("dashboard.member");
  const tc = useTranslations("common");
  const locale = useLocale();
  const canSeeKids = me.perms.includes("members.read");
  const name = locale === "ar" && d.firstNameAr ? d.firstNameAr : d.firstName;

  const tiles: Tile[] = [
    { key: "events", href: "/dashboard/events", icon: PartyPopper, tone: "bg-coral text-white" },
    { key: "trips", href: "/dashboard/trips", icon: Bus, tone: "bg-sky text-white" },
    { key: "announcements", href: "/dashboard/announcements", icon: Megaphone, tone: "bg-sun text-ink" },
    { key: "teams", href: "/dashboard/teams", icon: Users, tone: "bg-grape text-white" },
    { key: "messages", href: "/dashboard/messages", icon: MessagesSquare, tone: "bg-teal text-white", badge: d.unreadMessages },
    { key: "baggage", href: "/dashboard/content/songs", icon: Backpack, tone: "bg-leaf text-white", hint: t("baggageCount", d.counts) },
    ...(canSeeKids ? [{ key: "kids", href: "/dashboard/kids", icon: Smile, tone: "bg-brand-600 text-white" }] : []),
  ];

  return (
    <div className="space-y-6" data-testid="member-home">
      <MemberHero org={d.org} name={name} />

      <section aria-labelledby="home-shortcuts">
        <h2 id="home-shortcuts" className="sr-only">
          {t("shortcuts")}
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
          {tiles.map((tile, i) => (
            <li key={tile.key} className="animate-[var(--animate-fade-up)]" style={{ animationDelay: `${i * 50}ms` }}>
              <ShortcutTile tile={tile} />
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Section title={t("myTeams")} href="/dashboard/teams" actionLabel={tc("actions.viewAll")}>
          <MyTeams teams={d.teams} directed={d.directed} />
        </Section>
        <Section title={t("editions")} href="/dashboard/events" actionLabel={tc("actions.viewAll")}>
          <Editions editions={d.editions} />
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Section title={t("tripsManaged")} href="/dashboard/trips" actionLabel={tc("actions.viewAll")}>
          <ManagedTrips trips={d.trips} />
        </Section>
        <Section title={t("latestAnnouncements")} href="/dashboard/announcements" actionLabel={tc("actions.viewAll")}>
          <AnnouncementList items={d.announcements} empty={t("noAnnouncements")} />
        </Section>
      </div>
    </div>
  );
}

function MemberHero({ org, name }: { org: MemberData["org"]; name: string }) {
  const t = useTranslations("dashboard.member");
  const locale = useLocale();
  const fullName = locale === "ar" ? (org.fullNameAr ?? org.fullName) : org.fullName;
  return (
    <header className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 p-5 text-white shadow-[var(--shadow-lift)] sm:p-8 rtl:bg-gradient-to-bl">
      <div className="bg-confetti absolute inset-0 -z-10 opacity-60 mix-blend-screen" aria-hidden />
      <div className="absolute -end-16 -top-20 -z-10 size-64 rounded-full bg-sun/30 blur-3xl" aria-hidden />
      <div className="absolute -bottom-24 start-1/3 -z-10 size-56 rounded-full bg-leaf/30 blur-3xl" aria-hidden />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <span className="grid size-16 shrink-0 animate-[var(--animate-float)] place-items-center rounded-3xl bg-white p-2 shadow-lg sm:size-20">
          <img src={org.logoUrl ? assetUrl(org.logoUrl) : "/brand/onet-mark.svg"} alt="" className="size-full object-contain" />
        </span>
        <div className="min-w-0 animate-[var(--animate-fade-up)]">
          <p className="text-xs font-extrabold tracking-[0.14em] text-white/80 uppercase" dir="auto">
            {org.name}
          </p>
          <h1 className="mt-1 text-2xl leading-tight font-extrabold sm:text-3xl lg:text-4xl">{t.rich("welcome", { name, n: (c) => <bdi>{c}</bdi> })}</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-white/85 sm:text-base">{t("tagline")}</p>
          {fullName && (
            <p className="mt-2 truncate text-xs font-semibold text-white/65" dir="auto">
              {fullName}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}

function ShortcutTile({ tile }: { tile: Tile }) {
  const t = useTranslations("dashboard.member");
  const Icon = tile.icon;
  return (
    <Link
      href={tile.href}
      className={cn(
        "group relative isolate flex h-full min-h-32 flex-col justify-between gap-3 overflow-hidden rounded-3xl p-4 shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] sm:min-h-36 sm:p-5",
        tile.tone,
      )}
      data-testid={`home-tile-${tile.key}`}
    >
      <span className="absolute -end-6 -top-6 -z-10 size-24 rounded-full bg-white/15 transition-transform duration-300 group-hover:scale-125" aria-hidden />
      <span className="flex items-start justify-between gap-2">
        <span className="grid size-11 place-items-center rounded-2xl bg-white/25 ring-1 ring-white/30 backdrop-blur transition-transform duration-300 group-hover:-rotate-6 sm:size-12">
          <Icon className="size-6" />
        </span>
        {!!tile.badge && (
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-extrabold text-ink shadow-sm" aria-label={t("unread", { count: tile.badge })}>
            {tile.badge > 99 ? "99+" : tile.badge}
          </span>
        )}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-lg leading-tight font-extrabold sm:text-xl">
          {t(`tiles.${tile.key}.title`)}
          <ArrowRight className="rtl-flip size-4 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100 rtl:group-hover:-translate-x-0.5" />
        </span>
        <span className="mt-0.5 line-clamp-2 block text-xs font-semibold opacity-85 sm:text-sm">{tile.hint ?? t(`tiles.${tile.key}.hint`)}</span>
      </span>
    </Link>
  );
}

/** My groups: the events I direct first, then my edition teams. */
function MyTeams({ teams, directed }: { teams: MemberData["teams"]; directed: MemberData["directed"] }) {
  const t = useTranslations("dashboard.member");
  if (!teams.length && !directed.length) return <EmptyState compact title={t("noTeams")} description={t("noTeamsHint")} icon={<Users className="size-4" />} />;
  return (
    <ul className="space-y-2.5">
      {directed.map((e) => (
        <li key={e.id} className="relative flex items-center gap-3 rounded-2xl border border-line p-3 transition hover:border-transparent hover:shadow-[var(--shadow-soft)]">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl text-white" style={{ background: e.series?.color ?? "var(--color-brand-600)" }}>
            <ShieldCheck className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-1.5">
              <Link href={`/dashboard/events/${e.id}`} className="truncate font-bold text-ink after:absolute after:inset-0 hover:text-brand-700" dir="auto">
                {e.title}
              </Link>
              <span className="inline-flex items-center gap-1 rounded-full bg-sun-soft px-2 py-0.5 text-[11px] font-extrabold text-ink">
                <ShieldCheck className="size-3" /> {t("director")}
              </span>
            </span>
            <span className="block text-xs font-semibold text-ink-2">
              {t("directedTeams", { count: e.teams })} · {t("teamKids", { count: e.kids })}
            </span>
          </span>
        </li>
      ))}
      {teams.map((team) => {
        return (
          <li key={team.id} className="relative flex items-center gap-3 rounded-2xl border border-line p-3 transition hover:border-transparent hover:shadow-[var(--shadow-soft)]">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl text-white" style={{ background: team.color }}>
              <Users className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <Link href="/dashboard/teams" className="truncate font-bold text-ink after:absolute after:inset-0 hover:text-brand-700" dir="auto">
                  {team.name}
                </Link>
                {team.isLeader && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sun-soft px-2 py-0.5 text-[11px] font-extrabold text-ink">
                    <Crown className="size-3" /> {t("leader")}
                  </span>
                )}
              </span>
              <span className="block truncate text-xs text-muted">
                <bdi>{team.event.title}</bdi>
              </span>
              <span className="block text-xs font-semibold text-ink-2">
                {t("teamMembers", { count: team.animators })} · {t("teamKids", { count: team.kids })}
              </span>
            </span>
            {team.conversationId && (
              <Link
                href={`/dashboard/messages?c=${team.conversationId}`}
                className="relative z-10 grid size-10 shrink-0 place-items-center rounded-xl bg-teal-soft text-teal transition hover:bg-teal hover:text-white"
                aria-label={t("openChat")}
                title={t("openChat")}
              >
                <MessagesSquare className="size-5" />
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Editions({ editions }: { editions: MemberData["editions"] }) {
  const t = useTranslations("dashboard.member");
  const locale = useLocale();
  const range = useRange();
  if (!editions.length) return <EmptyState compact title={t("noEditions")} icon={<PartyPopper className="size-4" />} />;
  return (
    <ul className="space-y-2.5">
      {editions.map((e) => {
        const color = e.series?.color ?? CATEGORY_COLORS.CHILDREN;
        const seriesName = e.series ? (locale === "ar" ? (e.series.nameAr ?? e.series.name) : e.series.name) : null;
        return (
          <li key={e.id} className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-line p-3 ps-4 transition hover:border-transparent hover:shadow-[var(--shadow-soft)]">
            <span className="absolute inset-y-0 start-0 w-1.5" style={{ background: color }} aria-hidden />
            <CoverArt src={e.coverUrl} seed={e.id} color={color} icon={<PartyPopper />} className="size-12 shrink-0 rounded-xl [&_svg]:!size-5" />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <Link href={`/dashboard/events/${e.id}`} className="truncate font-bold text-ink after:absolute after:inset-0 hover:text-brand-700" dir="auto">
                  {e.title}
                </Link>
                {e.ongoing && <span className="rounded-full bg-leaf-soft px-2 py-0.5 text-[11px] font-extrabold text-emerald-800">{t("ongoing")}</span>}
              </span>
              <span className="block truncate text-xs text-muted">
                {seriesName && <bdi>{seriesName}</bdi>}
                {seriesName && (e.editionNumber != null || e.seasonYear != null) && " · "}
                {e.editionNumber != null ? t("editionNumber", { number: e.editionNumber }) : e.seasonYear != null ? t("season", { year: e.seasonYear }) : null}
              </span>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-semibold text-ink-2">
                <span className="inline-flex items-center gap-1">
                  <CalendarRange className="size-3.5 shrink-0" /> {range(e.startAt, e.endAt)}
                </span>
                {e.location && (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin className="size-3.5 shrink-0" /> <span className="truncate">{e.location}</span>
                  </span>
                )}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ManagedTrips({ trips }: { trips: MemberData["trips"] }) {
  const t = useTranslations("dashboard.member");
  const range = useRange();
  if (!trips.length) return <EmptyState compact title={t("noTrips")} icon={<Bus className="size-4" />} />;
  return (
    <ul className="space-y-2.5">
      {trips.map((trip) => {
        const color = CATEGORY_COLORS[trip.category] ?? CATEGORY_COLORS.EXCURSION;
        return (
          <li key={trip.id} className="relative flex items-center gap-3 rounded-2xl border border-line p-3 transition hover:border-transparent hover:shadow-[var(--shadow-soft)]">
            <CoverArt src={trip.coverUrl} seed={trip.id} color={color} icon={<Bus />} className="size-12 shrink-0 rounded-xl [&_svg]:!size-5" />
            <span className="min-w-0 flex-1">
              <Link href={`/dashboard/trips/${trip.id}`} className="block truncate font-bold text-ink after:absolute after:inset-0 hover:text-brand-700">
                <bdi>{trip.title}</bdi>
              </Link>
              <span className="flex items-center gap-1 truncate text-xs text-muted">
                <MapPin className="size-3.5 shrink-0" /> <span className="truncate">{trip.destination}</span>
              </span>
              <span className="block text-xs font-semibold text-ink-2">
                {range(trip.departAt, trip.returnAt)} · {t("participants", { count: trip._count.registrations, capacity: trip.capacity })}
              </span>
            </span>
            <Link
              href={`/dashboard/trips/${trip.id}/report`}
              className="relative z-10 inline-flex shrink-0 items-center gap-1 rounded-xl bg-sky-soft px-2.5 py-2 text-xs font-extrabold text-sky transition hover:bg-sky hover:text-white"
            >
              <ClipboardList className="size-4" /> <span className="hidden sm:inline">{t("report")}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

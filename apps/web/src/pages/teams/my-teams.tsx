import { useLocale, useTranslations } from "use-intl";
import { CalendarDays, Crown, MessagesSquare, Smile, UserCheck, Users } from "lucide-react";
import type { allTeamsPage, myTeamsPage } from "@api/modules/events/teams";
import { can, useMe } from "@/lib/auth";
import { useApi } from "@/lib/query";
import { useSearchParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { RequirePerm } from "@/components/states/guards";
import { QueryView } from "@/components/states/page-state";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { PhaseBadge, SeriesKindIcon, seriesName, useDateRange, useEditionLabel } from "@/components/events/series-visuals";

type Mine = Loaded<typeof myTeamsPage>;
type All = Loaded<typeof allTeamsPage>;
type Team = Mine["current"][number];

/** /dashboard/teams — the user's teams (leader or member); admins also get every team of the current editions. */
export function Component() {
  const t = useTranslations("events.teams");
  const tn = useTranslations("nav");
  const me = useMe();
  usePageTitle(t("title"));
  const admin = can(me, "events.manage");
  const tabParam = useSearchParams().get("tab");
  const tab = admin && tabParam === "all" ? "all" : "mine";
  return (
    <RequirePerm perm="events.read">
      <PageHeader icon={<Users className="size-6" />} title={t("title")} description={t("description")} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title") }]} />
      {admin && (
        <LinkTabs
          tabs={[
            { key: "mine", label: t("tabs.mine"), href: "/dashboard/teams" },
            { key: "all", label: t("tabs.all"), href: "/dashboard/teams?tab=all" },
          ]}
          active={tab}
        />
      )}
      {tab === "all" ? <AllTeams /> : <MyTeams />}
    </RequirePerm>
  );
}

function MyTeams() {
  const t = useTranslations("events.teams");
  const query = useApi<Mine>("/teams/mine");
  return (
    <QueryView query={query}>
      {({ current, past }) =>
        current.length || past.length ? (
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 text-lg font-extrabold text-ink">{t("current")}</h2>
              {current.length ? <TeamGrid teams={current} /> : <p className="card p-5 text-sm text-muted">{t("emptyCurrent")}</p>}
            </section>
            {past.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-extrabold text-ink">{t("past")}</h2>
                <TeamGrid teams={past} />
              </section>
            )}
          </div>
        ) : (
          <div className="card">
            <EmptyState icon={<Users className="size-5" />} title={t("empty")} description={t("emptyHint")} />
          </div>
        )
      }
    </QueryView>
  );
}

function AllTeams() {
  const t = useTranslations("events.teams");
  const query = useApi<All>("/teams");
  return (
    <QueryView query={query}>
      {({ teams }) =>
        teams.length ? (
          <TeamGrid teams={teams} />
        ) : (
          <div className="card">
            <EmptyState icon={<Users className="size-5" />} title={t("emptyAll")} />
          </div>
        )
      }
    </QueryView>
  );
}

function TeamGrid({ teams }: { teams: Team[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {teams.map((team, i) => (
        <li key={team.id} className="animate-[var(--animate-fade-up)]" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
          <TeamListCard team={team} />
        </li>
      ))}
    </ul>
  );
}

function TeamListCard({ team }: { team: Team }) {
  const t = useTranslations("events.teams");
  const locale = useLocale();
  const range = useDateRange();
  const label = useEditionLabel();
  const e = team.edition;
  const s = e.series;
  return (
    <article className="card flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 text-white" style={{ background: team.color }}>
        <h3 className="truncate text-lg font-extrabold" dir="auto">
          {team.name}
        </h3>
        {team.role && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-extrabold" style={{ color: team.color }}>
            {team.role === "LEADER" ? <Crown className="size-3" /> : <UserCheck className="size-3" />} {t(`role.${team.role}`)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          {s && (
            <p className="flex items-center gap-1.5 text-xs font-extrabold" style={{ color: s.color }}>
              <SeriesKindIcon kind={s.kind} className="size-3.5" /> {seriesName(s, locale)}
              {(e.editionNumber || e.seasonYear) && <span className="font-bold text-muted">· {label(s.kind, e)}</span>}
            </p>
          )}
          <p className="mt-0.5 font-bold text-ink">
            <bdi>{e.title}</bdi>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" /> {range(e.startAt, e.endAt, locale)}
            </span>
            <PhaseBadge e={e} />
          </p>
        </div>
        <div className="flex items-center gap-3">
          {team.leader ? (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar size="sm" firstName={team.leader.firstName} lastName={team.leader.lastName} src={team.leader.photoUrl} />
              <span className="min-w-0">
                <span className="block text-[11px] font-extrabold tracking-wide text-muted uppercase">{t("leader")}</span>
                <span className="block truncate text-sm font-bold text-ink">{team.leader.name}</span>
              </span>
            </span>
          ) : (
            <span className="text-sm text-muted">{t("noLeader")}</span>
          )}
          {team.members.length > 0 && (
            <span className="ms-auto shrink-0">
              <AvatarStack people={team.members} max={4} />
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="info">
            <Users className="size-3" /> {t("animators", { count: team.memberCount })}
          </Badge>
          <Badge tone="warning">
            <Smile className="size-3" /> {t("kids", { count: team.kidsCount })}
          </Badge>
        </div>
        <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-3">
          <LinkButton href={`/dashboard/events/${e.id}?tab=teams`} variant="outline" size="sm">
            {t("openEdition")}
          </LinkButton>
          {team.role && team.conversationId && (
            <LinkButton href={`/dashboard/messages?c=${team.conversationId}`} variant="soft" size="sm">
              <MessagesSquare className="size-4" /> {t("openChat")}
            </LinkButton>
          )}
        </div>
      </div>
    </article>
  );
}

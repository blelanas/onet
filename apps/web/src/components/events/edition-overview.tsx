import { useTranslations } from "use-intl";
import { ArrowRight, Crown, MessagesSquare, ShieldCheck, Smile, UserCheck, Users } from "lucide-react";
import type { eventPage } from "@api/modules/events/routes";
import { Link } from "@/lib/router";
import type { Loaded } from "@/lib/types";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { KpiCard } from "@/components/ui/kpi-card";
import { Section } from "@/components/ui/section";

type Data = Loaded<typeof eventPage>;

/** Overview block of an edition: the user's role, key numbers and the teams at a glance. */
export function EditionOverview({ eventId, data, color }: { eventId: string; data: Data; color: string }) {
  const t = useTranslations("events");
  const { teams, kidsCount, isLeader, isOnTeam, isDirector } = data;
  const animators = teams.reduce((n, x) => n + x.memberCount, 0);
  const base = `/dashboard/events/${eventId}`;
  return (
    <>
      {(isDirector || isLeader || isOnTeam) && (
        <p className="flex items-start gap-3 rounded-2xl p-4 text-sm font-semibold text-ink" style={{ background: `${color}1A` }}>
          <span className="grid size-9 shrink-0 place-items-center rounded-xl text-white" style={{ background: color }}>
            {isDirector ? <ShieldCheck className="size-4" /> : isLeader ? <Crown className="size-4" /> : <UserCheck className="size-4" />}
          </span>
          <span className="pt-1.5">{isDirector ? t("edition.roleDirector") : isLeader ? t("edition.roleLeader") : t("edition.roleMember")}</span>
        </p>
      )}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label={t("edition.kpi.kids")} value={kidsCount} icon={<Smile className="size-5" />} accent="sun" href={data.canSeeKids ? `${base}?tab=kids` : undefined} />
        <KpiCard label={t("edition.kpi.teams")} value={teams.length} icon={<Users className="size-5" />} accent="leaf" href={`${base}?tab=teams`} />
        <KpiCard label={t("edition.kpi.animators")} value={animators} icon={<UserCheck className="size-5" />} accent="sky" />
      </div>
      {teams.length > 0 && (
        <Section
          title={t("edition.tabs.teams")}
          action={
            <Link href={`${base}?tab=teams`} className="inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:text-brand-700">
              {t("edition.seeAllTeams")} <ArrowRight className="rtl-flip size-4" />
            </Link>
          }
        >
          <ul className="grid gap-3 sm:grid-cols-2">
            {teams.map((team) => (
              <li key={team.id} className="flex items-center gap-3 rounded-2xl border border-line p-3" style={{ borderInlineStartColor: team.color, borderInlineStartWidth: 4 }}>
                {team.leader ? <Avatar firstName={team.leader.firstName} lastName={team.leader.lastName} src={team.leader.photoUrl} /> : <span className="size-10 shrink-0 rounded-full" style={{ background: `${team.color}33` }} />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">
                    <bdi>{team.name}</bdi>
                  </p>
                  <p className="truncate text-xs text-muted">
                    {team.leader ? team.leader.name : t("teams.noLeader")} · {t("teams.kids", { count: team.kidsCount })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {team.members.length > 0 && (
                    <span className="hidden sm:block">
                      <AvatarStack people={team.members} max={3} />
                    </span>
                  )}
                  {team.conversationId && (
                    <Link href={`/dashboard/messages?c=${team.conversationId}`} className="rounded-xl p-2 text-muted hover:bg-surface-2 hover:text-brand-700" aria-label={t("teams.openChat")} title={t("teams.openChat")}>
                      <MessagesSquare className="size-4" />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

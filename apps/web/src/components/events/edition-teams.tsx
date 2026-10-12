import { useState } from "react";
import { useTranslations } from "use-intl";
import { Crown, MessagesSquare, Phone, Plus, Settings2, Trash2, Users } from "lucide-react";
import type { editionTeamsPage } from "@api/modules/events/teams";
import { useApi } from "@/lib/query";
import type { Loaded } from "@/lib/types";
import { deleteTeam } from "@/api/events";
import { QueryView } from "@/components/states/page-state";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamFormModal, type TeamFormValues } from "./team-form";

type Data = Loaded<typeof editionTeamsPage>;
type Team = Data["teams"][number];

/** Teams tab of an edition: one card per team, managed by admins (all) and leaders (their own team). */
export function EditionTeams({ eventId }: { eventId: string }) {
  const query = useApi<Data>(`/events/${eventId}/teams`);
  return (
    <QueryView query={query} skeleton={<Skeleton className="h-64 rounded-3xl" />}>
      {(data) => <TeamsView eventId={eventId} data={data} />}
    </QueryView>
  );
}

function TeamsView({ eventId, data }: { eventId: string; data: Data }) {
  const t = useTranslations("events.teams");
  const { teams, candidates, canManage, ledTeamIds, myTeamIds } = data;
  const [editing, setEditing] = useState<{ values: TeamFormValues; locked: boolean; leaderName: string | null } | null>(null);
  const edit = (team: Team) =>
    setEditing({
      values: { id: team.id, name: team.name, color: team.color, leaderId: team.leaderId, memberIds: team.members.map((m) => m.id) },
      locked: !canManage,
      leaderName: team.leader?.name ?? null,
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-muted">{t("count", { count: teams.length })}</p>
        {canManage && (
          <Button onClick={() => setEditing({ values: {}, locked: false, leaderName: null })}>
            <Plus className="size-4" /> {t("new")}
          </Button>
        )}
      </div>
      {teams.length ? (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <li key={team.id}>
              <TeamCard team={team} canEdit={canManage || ledTeamIds.includes(team.id)} canDelete={canManage} onTeam={myTeamIds.includes(team.id)} onEdit={() => edit(team)} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="card">
          <EmptyState
            icon={<Users className="size-5" />}
            title={t("emptyEdition")}
            description={canManage ? t("emptyEditionHint") : undefined}
            action={
              canManage ? (
                <Button onClick={() => setEditing({ values: {}, locked: false, leaderName: null })}>
                  <Plus className="size-4" /> {t("new")}
                </Button>
              ) : undefined
            }
          />
        </div>
      )}
      <TeamFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        eventId={eventId}
        initial={editing?.values ?? {}}
        candidates={candidates}
        leaderLocked={editing?.locked}
        leaderName={editing?.leaderName}
      />
    </div>
  );
}

function TeamCard({ team, canEdit, canDelete, onTeam, onEdit }: { team: Team; canEdit: boolean; canDelete: boolean; onTeam: boolean; onEdit: () => void }) {
  const t = useTranslations("events.teams");
  const tc = useTranslations("common");
  return (
    <article className="card flex h-full flex-col overflow-hidden">
      <div className="h-2 shrink-0" style={{ background: team.color }} aria-hidden />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex min-w-0 items-center gap-2 text-lg font-extrabold text-ink">
            <span className="size-3 shrink-0 rounded-full" style={{ background: team.color }} aria-hidden />
            <span className="truncate" dir="auto">
              {team.name}
            </span>
          </h3>
          <Badge color={team.color}>{t("kids", { count: team.kidsCount })}</Badge>
        </div>

        {team.leader ? (
          <div className="flex items-center gap-3 rounded-2xl p-2.5" style={{ background: `${team.color}14` }}>
            <Avatar firstName={team.leader.firstName} lastName={team.leader.lastName} src={team.leader.photoUrl} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-[11px] font-extrabold tracking-wide uppercase" style={{ color: team.color }}>
                <Crown className="size-3" /> {t("leader")}
              </p>
              <p className="truncate font-bold text-ink">{team.leader.name}</p>
            </div>
            {team.leader.phone && (
              <a href={`tel:${team.leader.phone.replace(/\s/g, "")}`} className="rounded-xl p-2 text-muted hover:bg-surface hover:text-ink" aria-label={`${tc("fields.phone")} ${team.leader.name}`}>
                <Phone className="size-4" />
              </a>
            )}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-line p-2.5 text-sm text-muted">{t("noLeader")}</p>
        )}

        <div>
          <p className="mb-2 flex items-center justify-between text-xs font-extrabold tracking-wide text-muted uppercase">
            {t("members")} <span>{team.members.length}</span>
          </p>
          {team.members.length ? (
            <>
              <AvatarStack people={team.members} max={6} />
              <ul className="mt-2 space-y-1">
                {team.members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-semibold text-ink-2">{m.name}</span>
                    {m.phone && (
                      <a href={`tel:${m.phone.replace(/\s/g, "")}`} dir="ltr" className="shrink-0 text-xs text-muted hover:text-brand-700">
                        {m.phone}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted">{t("noMembers")}</p>
          )}
        </div>

        <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-3">
          {onTeam && team.conversationId && (
            <LinkButton href={`/dashboard/messages?c=${team.conversationId}`} variant="soft" size="sm">
              <MessagesSquare className="size-4" /> {t("openChat")}
            </LinkButton>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Settings2 className="size-4" /> {t("manage")}
            </Button>
          )}
          {canDelete && (
            <ConfirmButton action={deleteTeam.bind(null, team.id)} variant="ghost" size="sm" title={t("deleteTitle")} description={t("deleteText")} ariaLabel={tc("actions.delete")} className="ms-auto">
              <Trash2 className="size-4" />
            </ConfirmButton>
          )}
        </div>
      </div>
    </article>
  );
}

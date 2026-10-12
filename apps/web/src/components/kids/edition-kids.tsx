import { useState, useTransition } from "react";
import { useTranslations } from "use-intl";
import { Download, HeartPulse, Pencil, Phone, Printer, Smile, UserMinus } from "lucide-react";
import { toast } from "sonner";
import type { editionKidsPage } from "@api/modules/kids/queries";
import { download } from "@/lib/api";
import { refreshAll, useApi } from "@/lib/query";
import { Link, useSearchParamsObject } from "@/lib/router";
import type { Loaded } from "@/lib/types";
import { cn } from "@/lib/utils";
import { removeKid, setKidTeam } from "@/api/kids";
import { QueryView } from "@/components/states/page-state";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClasses } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterSelect, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { KidCardsGrid } from "./kid-card";
import { AddKidButton, EditKidModal, type KidFormValues } from "./kid-forms";
import { useKidsView, ViewToggle } from "./view-toggle";

type Data = Loaded<typeof editionKidsPage>;
type Row = Data["rows"][number];

/** Kids tab of an edition: list (with inline team assignment for managers), printable cards, add / edit / remove, CSV. */
export function EditionKids({ eventId }: { eventId: string }) {
  const sp = useSearchParamsObject();
  const query = useApi<Data>(`/events/${eventId}/kids`, { q: sp.q, teamId: sp.teamId });
  return (
    <QueryView query={query} skeleton={<Skeleton className="h-64 rounded-3xl" />}>
      {(data) => <KidsView eventId={eventId} data={data} filtered={!!(sp.q || sp.teamId)} q={sp.q} teamId={sp.teamId} />}
    </QueryView>
  );
}

function KidsView({ eventId, data, filtered, q, teamId }: { eventId: string; data: Data; filtered: boolean; q?: string; teamId?: string }) {
  const t = useTranslations("kids");
  const tc = useTranslations("common");
  const view = useKidsView();
  const { rows, teams, canManage, total, edition } = data;
  const [editing, setEditing] = useState<(KidFormValues & { id: string }) | null>(null);
  const edit = (r: Row) =>
    setEditing({
      id: r.member.id,
      firstName: r.member.firstName,
      lastName: r.member.lastName,
      firstNameAr: r.member.firstNameAr,
      lastNameAr: r.member.lastNameAr,
      dateOfBirth: r.member.dateOfBirth,
      gender: r.member.gender,
      photoUrl: r.member.photoUrl,
      medicalNotes: r.medicalNotes,
      parentName: r.guardian?.name,
      parentPhone: r.guardian?.phone,
      parentRelation: r.guardian?.relation,
      parentLocked: r.guardian?.hasLogin,
    });

  const columns: Column<Row>[] = [
    { key: "kid", header: t("columns.kid"), cell: (r) => <KidName r={r} /> },
    { key: "team", header: t("columns.team"), cell: (r) => (canManage ? <TeamSelect key={`${r.registrationId}-${r.team?.id ?? ""}`} eventId={eventId} r={r} teams={teams} /> : <TeamBadge team={r.team} />) },
    {
      key: "parent",
      header: t("columns.parent"),
      hideBelow: "lg",
      cell: (r) =>
        r.guardian ? (
          <span className="text-sm">
            <span className="block font-semibold text-ink">{r.guardian.name}</span>
            <span className="text-xs text-muted">{tc(`enums.relation.${r.guardian.relation}`)}</span>
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    { key: "phone", header: t("columns.phone"), cell: (r) => <PhoneLink phone={r.guardian?.phone} /> },
    ...(canManage ? [{ key: "actions", header: <span className="sr-only">{tc("fields.actions")}</span>, align: "end" as const, cell: (r: Row) => <RowActions eventId={eventId} r={r} onEdit={() => edit(r)} /> }] : []),
  ];

  return (
    <div className="space-y-4">
      <Toolbar className="no-print">
        <SearchBox placeholder={t("searchPlaceholder")} className="sm:min-w-52" />
        {teams.length > 0 && <FilterSelect param="teamId" allLabel={t("filters.allTeams")} options={[...teams.map((x) => ({ value: x.id, label: x.name })), { value: "none", label: t("filters.noTeam") }]} />}
        <div className="flex flex-wrap items-center gap-2 sm:ms-auto">
          <ViewToggle />
          {view === "cards" && rows.length > 0 && (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" /> <span className="hidden sm:inline">{t("cards.print")}</span>
            </Button>
          )}
          <Button variant="outline" onClick={() => void download(`/events/${eventId}/kids/export.csv`, { q, teamId })} aria-label={tc("actions.exportCsv")}>
            <Download className="size-4" /> <span className="hidden sm:inline">{tc("actions.exportCsv")}</span>
          </Button>
          {canManage && <AddKidButton eventId={eventId} teams={teams} />}
        </div>
      </Toolbar>
      <p className="no-print text-sm font-semibold text-muted">{t("total", { count: filtered ? rows.length : total })}</p>

      {!rows.length ? (
        <div className="card">
          <EmptyState
            icon={<Smile className="size-5" />}
            title={filtered ? tc("states.noResults") : t("emptyEdition")}
            description={filtered ? tc("states.noResultsHint") : canManage ? t("emptyEditionHint") : undefined}
            action={!filtered && canManage ? <AddKidButton eventId={eventId} teams={teams} /> : undefined}
          />
        </div>
      ) : view === "cards" ? (
        <KidCardsGrid caption={edition.title} kids={rows.map((r) => ({ key: r.registrationId, member: r.member, team: r.team, guardian: r.guardian, medicalNotes: r.medicalNotes }))} />
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.registrationId}
          mobileCard={(r) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <KidName r={r} />
                {canManage && <RowActions eventId={eventId} r={r} onEdit={() => edit(r)} />}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                {canManage ? <TeamSelect key={`${r.registrationId}-${r.team?.id ?? ""}`} eventId={eventId} r={r} teams={teams} /> : <TeamBadge team={r.team} />}
                <PhoneLink phone={r.guardian?.phone} />
              </div>
              {r.guardian && (
                <p className="text-xs text-muted">
                  {r.guardian.name} · {tc(`enums.relation.${r.guardian.relation}`)}
                </p>
              )}
            </div>
          )}
        />
      )}
      {editing && <EditKidModal open onClose={() => setEditing(null)} initial={editing} />}
    </div>
  );
}

function KidName({ r }: { r: Row }) {
  const tc = useTranslations("common");
  const t = useTranslations("kids");
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar firstName={r.member.firstName} lastName={r.member.lastName} src={r.member.photoUrl} />
      <span className="min-w-0">
        <Link href={`/dashboard/members/${r.member.id}`} className="block truncate font-bold text-ink hover:text-brand-700">
          {r.member.firstName} {r.member.lastName}
        </Link>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          {r.member.age !== null ? tc("fields.years", { count: r.member.age }) : "—"}
          {r.medicalNotes && (
            <span className="inline-flex items-center gap-0.5 font-bold text-coral" title={r.medicalNotes}>
              <HeartPulse className="size-3.5" aria-hidden /> <span className="sr-only sm:not-sr-only">{t("medical")}</span>
            </span>
          )}
        </span>
      </span>
    </span>
  );
}

function TeamBadge({ team }: { team: { name: string; color: string } | null }) {
  const t = useTranslations("kids");
  return team ? <Badge color={team.color}>{team.name}</Badge> : <span className="text-sm text-muted">{t("filters.noTeam")}</span>;
}

function PhoneLink({ phone }: { phone?: string | null }) {
  if (!phone) return <span className="text-muted">—</span>;
  return (
    <a href={`tel:${phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm font-bold whitespace-nowrap text-ink hover:bg-surface-2 hover:text-brand-700" dir="ltr">
      <Phone className="size-3.5 text-muted" /> {phone}
    </a>
  );
}

/** Inline team assignment: saves on change. */
function TeamSelect({ eventId, r, teams }: { eventId: string; r: Row; teams: { id: string; name: string; color: string }[] }) {
  const t = useTranslations("kids");
  const tc = useTranslations("common");
  const [pending, start] = useTransition();
  const [value, setValue] = useState(r.team?.id ?? "");
  const color = teams.find((x) => x.id === value)?.color;
  return (
    <select
      value={value}
      disabled={pending || !teams.length}
      aria-label={t("team.label", { name: r.member.firstName })}
      onChange={(e) => {
        const next = e.target.value;
        const prev = value;
        setValue(next);
        start(async () => {
          const res = await setKidTeam(eventId, r.registrationId, next || null);
          if (res.ok) {
            toast.success(t("team.saved"));
            void refreshAll();
          } else {
            setValue(prev);
            toast.error(res.error.startsWith("errors.") ? tc(res.error) : res.error);
          }
        });
      }}
      className={cn(inputClasses, "w-auto max-w-44 cursor-pointer py-1.5 ps-3 pe-7 text-sm font-bold")}
      style={color ? { borderColor: color, boxShadow: `inset 4px 0 0 ${color}` } : undefined}
    >
      <option value="">{t("filters.noTeam")}</option>
      {teams.map((x) => (
        <option key={x.id} value={x.id}>
          {x.name}
        </option>
      ))}
    </select>
  );
}

function RowActions({ eventId, r, onEdit }: { eventId: string; r: Row; onEdit: () => void }) {
  const t = useTranslations("kids");
  const name = `${r.member.firstName} ${r.member.lastName}`;
  return (
    <span className="inline-flex items-center gap-1">
      <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={t("edit.button")} title={t("edit.button")}>
        <Pencil className="size-4" />
      </Button>
      <ConfirmButton action={removeKid.bind(null, eventId, r.registrationId)} size="icon-sm" title={t("remove.title", { name })} description={t("remove.text")} confirmLabel={t("remove.confirm")} ariaLabel={t("remove.button")} successMessage="toast.saved">
        <UserMinus className="size-4" />
      </ConfirmButton>
    </span>
  );
}

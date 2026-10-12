import { useLocale, useTranslations } from "use-intl";
import { Download, HeartPulse, Phone, Printer, Smile } from "lucide-react";
import type { kidsPage } from "@api/modules/kids/queries";
import { download } from "@/lib/api";
import { useApi } from "@/lib/query";
import { Link, usePathname, useRouter, useSearchParams, useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RequirePerm } from "@/components/states/guards";
import { QueryView } from "@/components/states/page-state";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClasses } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchBox, Toolbar } from "@/components/ui/toolbar";
import { seriesName } from "@/components/events/series-visuals";
import { KidCardsGrid } from "@/components/kids/kid-card";
import { useKidsView, ViewToggle } from "@/components/kids/view-toggle";

type Data = Loaded<typeof kidsPage>;
type Row = Data["rows"][number];

const FILTERS = ["q", "seriesId", "eventId", "year", "teamId"] as const;

/** /dashboard/kids — kids of the programmes (scoped to the user's editions unless admin), list or printable cards. */
export function Component() {
  const t = useTranslations("kids");
  const tn = useTranslations("nav");
  usePageTitle(t("title"));
  const sp = useSearchParamsObject();
  const query = useApi<Data>("/kids", { q: sp.q, seriesId: sp.seriesId, eventId: sp.eventId, year: sp.year, teamId: sp.teamId, page: sp.page });
  return (
    <RequirePerm perm="members.read">
      <PageHeader icon={<Smile className="size-6" />} title={t("title")} description={t("description")} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title") }]} />
      <QueryView query={query}>{(data) => <KidsDirectory data={data} sp={sp} />}</QueryView>
    </RequirePerm>
  );
}

/** URL-bound select that also clears the filters depending on it (series → edition → team). */
function useFilterPatch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (patch: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page");
    const qs = sp.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };
}

function KidsDirectory({ data, sp }: { data: Data; sp: Record<string, string | undefined> }) {
  const t = useTranslations("kids");
  const tc = useTranslations("common");
  const locale = useLocale();
  const view = useKidsView();
  const patch = useFilterPatch();
  const { rows, total, page, pageSize, series, editions, years, teams, seesAll } = data;
  const filtered = FILTERS.some((k) => sp[k]);
  const filterValues = Object.fromEntries(FILTERS.map((k) => [k, sp[k]]));
  const select = cn(inputClasses, "w-auto min-w-36 cursor-pointer py-2 pe-8");

  const columns: Column<Row>[] = [
    { key: "kid", header: t("columns.kid"), cell: (r) => <KidName r={r} /> },
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
    { key: "latest", header: t("columns.latest"), hideBelow: "md", cell: (r) => <Latest r={r} locale={locale} /> },
    { key: "editions", header: t("columns.editions"), align: "center", hideBelow: "xl", cell: (r) => <span className="font-bold tabular-nums">{r.editionsCount}</span> },
  ];

  return (
    <>
      <Toolbar className="no-print">
        <SearchBox placeholder={t("searchPlaceholder")} className="sm:min-w-52" />
        <select aria-label={t("filters.allSeries")} className={select} value={sp.seriesId ?? ""} onChange={(e) => patch({ seriesId: e.target.value || null, eventId: null, teamId: null })}>
          <option value="">{t("filters.allSeries")}</option>
          {series.map((s) => (
            <option key={s.id} value={s.id}>
              {seriesName(s, locale)}
            </option>
          ))}
        </select>
        <select aria-label={t("filters.allEditions")} className={select} value={sp.eventId ?? ""} onChange={(e) => patch({ eventId: e.target.value || null, teamId: null })}>
          <option value="">{t("filters.allEditions")}</option>
          {editions.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
        <select aria-label={t("filters.allYears")} className={select} value={sp.year ?? ""} onChange={(e) => patch({ year: e.target.value || null })}>
          <option value="">{t("filters.allYears")}</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        {sp.eventId && teams.length > 0 && (
          <select aria-label={t("filters.allTeams")} className={select} value={sp.teamId ?? ""} onChange={(e) => patch({ teamId: e.target.value || null })}>
            <option value="">{t("filters.allTeams")}</option>
            {teams.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:ms-auto">
          <ViewToggle />
          {view === "cards" && rows.length > 0 && (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" /> <span className="hidden sm:inline">{t("cards.print")}</span>
            </Button>
          )}
          <Button variant="outline" onClick={() => void download("/kids/export.csv", filterValues)} aria-label={tc("actions.exportCsv")}>
            <Download className="size-4" /> <span className="hidden sm:inline">{tc("actions.exportCsv")}</span>
          </Button>
        </div>
      </Toolbar>
      <p className="no-print mb-3 text-sm font-semibold text-muted">{t("total", { count: total })}</p>

      {!rows.length ? (
        <div className="card">
          <EmptyState icon={<Smile className="size-5" />} title={filtered ? tc("states.noResults") : t("empty")} description={filtered ? tc("states.noResultsHint") : seesAll ? undefined : t("emptyScoped")} />
        </div>
      ) : view === "cards" ? (
        <KidCardsGrid kids={rows.map((r) => ({ key: r.member.id, member: r.member, team: r.latestEdition?.team ?? null, guardian: r.guardian, medicalNotes: r.medicalNotes, caption: r.latestEdition?.title ?? null }))} />
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.member.id}
          mobileCard={(r) => (
            <div className="space-y-2.5">
              <KidName r={r} />
              <Latest r={r} locale={locale} />
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                <span>{r.guardian ? `${r.guardian.name} · ${tc(`enums.relation.${r.guardian.relation}`)}` : t("noParent")}</span>
                <PhoneLink phone={r.guardian?.phone} />
              </div>
            </div>
          )}
        />
      )}
      <div className="no-print">
        <Pagination page={page} pageSize={pageSize} total={total} basePath="/dashboard/kids" searchParams={sp} />
      </div>
    </>
  );
}

function KidName({ r }: { r: Row }) {
  const t = useTranslations("kids");
  const tc = useTranslations("common");
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar firstName={r.member.firstName} lastName={r.member.lastName} src={r.member.photoUrl} />
      <span className="min-w-0">
        <Link href={`/dashboard/members/${r.member.id}`} className="block truncate font-bold text-ink hover:text-brand-700">
          {r.member.firstName} {r.member.lastName}
        </Link>
        <span className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted">
          {r.member.age !== null ? tc("fields.years", { count: r.member.age }) : "—"}
          <span aria-hidden>·</span>
          {t("editionsCount", { count: r.editionsCount })}
          {r.medicalNotes && <HeartPulse className="size-3.5 text-coral" aria-label={t("medical")} />}
        </span>
      </span>
    </span>
  );
}

function Latest({ r, locale }: { r: Row; locale: string }) {
  const e = r.latestEdition;
  if (!e) return <span className="text-sm text-muted">—</span>;
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
      {e.series && <span className="size-2.5 shrink-0 rounded-full" style={{ background: e.series.color }} aria-hidden />}
      <Link href={`/dashboard/events/${e.id}`} className="truncate font-semibold text-ink-2 hover:text-brand-700" dir="auto" title={e.series ? seriesName(e.series, locale) : undefined}>
        {e.title}
      </Link>
      {e.team && <Badge color={e.team.color}>{e.team.name}</Badge>}
    </span>
  );
}

function PhoneLink({ phone }: { phone?: string | null }) {
  if (!phone) return <span className="text-muted">—</span>;
  return (
    <a href={`tel:${phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm font-bold whitespace-nowrap text-ink hover:bg-surface-2 hover:text-brand-700" dir="ltr">
      <Phone className="size-3.5 text-muted" /> {phone}
    </a>
  );
}

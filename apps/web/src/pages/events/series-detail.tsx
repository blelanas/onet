import { useLocale, useTranslations } from "use-intl";
import { CalendarDays, CalendarPlus, Edit, Layers, MapPin, Smile, Trash2, Users } from "lucide-react";
import type { seriesPage } from "@api/modules/events/series";
import { useApi } from "@/lib/query";
import { Link, useParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { deleteSeries } from "@/api/events";
import { RequirePerm } from "@/components/states/guards";
import { QueryView } from "@/components/states/page-state";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CoverArt } from "@/components/ui/cover-art";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Breadcrumbs } from "@/components/ui/page-header";
import { NewEditionButton } from "@/components/events/edition-form";
import { SeriesFormButton } from "@/components/events/series-form";
import { PhaseBadge, SeriesKindIcon, seriesNames, useDateRange, useEditionLabel } from "@/components/events/series-visuals";

type Data = Loaded<typeof seriesPage>;
type Edition = Data["years"][number]["editions"][number];

/** /dashboard/events/series/:id — a programme and its editions by year (newest first). */
export function Component() {
  const { id } = useParams();
  const query = useApi<Data>(`/series/${id}`);
  return (
    <RequirePerm perm="events.read">
      <QueryView query={query}>{(data) => <SeriesDetail data={data} />}</QueryView>
    </RequirePerm>
  );
}

function SeriesDetail({ data }: { data: Data }) {
  const t = useTranslations("events");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const { series: s, years, manage, next } = data;
  const names = seriesNames(s, locale);
  usePageTitle(names.primary);
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.events"), href: "/dashboard/events" }, { label: names.primary }]} />

      <div className="card overflow-hidden">
        <CoverArt src={s.coverUrl} seed={s.id} color={s.color} className="h-44 sm:h-60">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6">
            <div className="mb-2 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-extrabold" style={{ color: s.color }}>
                <SeriesKindIcon kind={s.kind} className="size-3.5" /> {tc(`enums.SERIES_KINDS.${s.kind}`)}
              </span>
              {!s.isActive && <span className="rounded-full bg-black/40 px-2.5 py-0.5 text-xs font-bold">{t("series.inactive")}</span>}
            </div>
            <h1 className="font-display text-3xl leading-tight font-extrabold drop-shadow sm:text-5xl">{names.primary}</h1>
            {names.secondary && (
              <p className="mt-1 text-base font-bold text-white/90 sm:text-lg">
                <bdi lang={names.secondaryIsAr ? "ar" : undefined}>{names.secondary}</bdi>
              </p>
            )}
          </div>
        </CoverArt>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
          <div className="min-w-0 space-y-2">
            {s.description && <p className="leading-relaxed whitespace-pre-line text-ink-2">{s.description}</p>}
            <p className="flex items-center gap-1.5 text-sm font-bold text-muted">
              <Layers className="size-4" /> {t("series.editions", { count: s.editionsCount })}
            </p>
          </div>
          {manage && (
            <div className="flex flex-wrap gap-2">
              {next && <NewEditionButton series={s} next={next} />}
              <SeriesFormButton initial={s} variant="outline">
                <Edit className="size-4" /> {tc("actions.edit")}
              </SeriesFormButton>
              <ConfirmButton
                action={deleteSeries.bind(null, s.id)}
                variant="outline"
                size="md"
                title={t("series.deleteTitle")}
                description={t("series.deleteText")}
                redirectTo="/dashboard/events"
                ariaLabel={tc("actions.delete")}
                disabled={s.editionsCount > 0}
              >
                <Trash2 className="size-4" />
              </ConfirmButton>
            </div>
          )}
        </div>
      </div>

      {years.length ? (
        years.map((y) => (
          <section key={y.year} aria-labelledby={`y-${y.year}`}>
            <h2 id={`y-${y.year}`} className="mb-3 flex items-center gap-3">
              <span className="rounded-xl px-2.5 py-1 font-display text-lg font-extrabold text-white tabular-nums" style={{ background: s.color }}>
                {s.kind === "FESTIVAL" ? y.year : `${y.year}-${y.year + 1}`}
              </span>
              <span className="h-px flex-1 bg-line" aria-hidden />
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {y.editions.map((e) => (
                <li key={e.id}>
                  <EditionCard e={e} kind={s.kind} color={s.color} />
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <div className="card">
          <EmptyState
            icon={<CalendarPlus className="size-5" />}
            title={t("edition.empty")}
            description={manage ? t("edition.emptyHint") : undefined}
            action={manage && next ? <NewEditionButton series={s} next={next} /> : undefined}
          />
        </div>
      )}
    </div>
  );
}

function EditionCard({ e, kind, color }: { e: Edition; kind: string; color: string }) {
  const t = useTranslations("events");
  const locale = useLocale();
  const range = useDateRange();
  const label = useEditionLabel();
  return (
    <Link href={`/dashboard/events/${e.id}`} className="card card-hover group flex h-full flex-col overflow-hidden focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none">
      <CoverArt src={e.coverUrl} seed={e.id} color={color} icon={<SeriesKindIcon kind={kind} />} className="h-28 shrink-0">
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <span className="rounded-full bg-surface/95 px-2.5 py-0.5 text-xs font-extrabold shadow-[var(--shadow-soft)]" style={{ color }}>
            {label(kind, e)}
          </span>
          <PhaseBadge e={e} className="bg-surface/95" />
        </div>
      </CoverArt>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-lg leading-snug font-extrabold text-ink group-hover:text-brand-700" dir="auto">
            {e.title}
          </h3>
          {e.isMine && <Badge tone="brand">{t("edition.mine")}</Badge>}
        </div>
        <p className="flex items-center gap-1.5 text-sm text-ink-2">
          <CalendarDays className="size-4 shrink-0 text-muted" /> {range(e.startAt, e.endAt, locale)}
        </p>
        {e.location && (
          <p className="flex items-center gap-1.5 text-sm text-ink-2">
            <MapPin className="size-4 shrink-0 text-muted" /> <span className="truncate">{e.location}</span>
          </p>
        )}
        <div className="mt-auto flex flex-wrap gap-3 border-t border-line pt-3 text-sm font-bold text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <Smile className="size-4 text-muted" /> {t("teams.kids", { count: e.kidsCount })}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4 text-muted" /> {t("teams.count", { count: e.teamsCount })}
          </span>
          {e.status !== "PUBLISHED" && e.status !== "COMPLETED" && <StatusBadge status={e.status} />}
        </div>
      </div>
    </Link>
  );
}

import { useLocale, useTranslations } from "use-intl";
import { Bus, CalendarDays, History, Layers, MapPin, PartyPopper, Users } from "lucide-react";
import type { kidHistoryPage } from "@api/modules/kids/queries";
import { formatDate } from "@onet/shared";
import { useApi } from "@/lib/query";
import { Link } from "@/lib/router";
import type { Loaded } from "@/lib/types";
import { QueryView } from "@/components/states/page-state";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { SeriesKindIcon, seriesName, useDateRange, useEditionLabel } from "@/components/events/series-visuals";

type Data = Loaded<typeof kidHistoryPage>;

/** Kid profile "History" tab: editions (programme, edition, team) and trips, grouped by year, newest first. */
export function KidHistory({ kidId }: { kidId: string }) {
  const query = useApi<Data>(`/kids/${kidId}/history`);
  return (
    <QueryView query={query} skeleton={<Skeleton className="h-64 rounded-3xl" />}>
      {(data) => <Timeline data={data} />}
    </QueryView>
  );
}

function Timeline({ data }: { data: Data }) {
  const t = useTranslations("kids.history");
  const locale = useLocale();
  const range = useDateRange();
  const editionLabel = useEditionLabel();
  const { years, stats } = data;
  if (!years.length) {
    return (
      <div className="card">
        <EmptyState icon={<History className="size-5" />} title={t("empty")} description={t("emptyHint")} />
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label={t("stats.editions")} value={stats.editions} icon={<PartyPopper className="size-5" />} accent="sun" />
        <KpiCard label={t("stats.series")} value={stats.series} icon={<Layers className="size-5" />} accent="leaf" />
        <KpiCard label={t("stats.trips")} value={stats.trips} icon={<Bus className="size-5" />} accent="sky" />
      </div>
      <section className="card p-5">
        <h2 className="mb-4 text-lg font-bold text-ink">{t("title")}</h2>
        <ol className="space-y-6">
          {years.map((y) => (
            <li key={y.year}>
              <h3 className="mb-3 flex items-center gap-3">
                <span className="rounded-xl bg-ink px-2.5 py-1 font-display text-lg font-extrabold text-white tabular-nums">{y.year}</span>
                <span className="h-px flex-1 bg-line" aria-hidden />
              </h3>
              <ul className="space-y-3 border-s-2 border-line ps-4">
                {y.editions.map((r) => {
                  const s = r.event.series;
                  const color = s?.color ?? "#7A7390";
                  return (
                    <li key={r.id} className="relative">
                      <span className="absolute top-3 -start-[1.4rem] size-3 rounded-full ring-4 ring-surface" style={{ background: color }} aria-hidden />
                      <Link href={`/dashboard/events/${r.event.id}`} className="card-hover block rounded-2xl border border-line p-3" style={{ borderInlineStartColor: color, borderInlineStartWidth: 4 }}>
                        <div className="flex flex-wrap items-center gap-2">
                          {s ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold" style={{ color }}>
                              <SeriesKindIcon kind={s.kind} className="size-3.5" /> {seriesName(s, locale)}
                            </span>
                          ) : (
                            <span className="text-xs font-extrabold text-muted">{t("event")}</span>
                          )}
                          {s && (r.event.editionNumber || r.event.seasonYear) && <Badge tone="neutral">{editionLabel(s.kind, r.event)}</Badge>}
                          {r.team && (
                            <Badge color={r.team.color}>
                              <Users className="size-3" aria-hidden /> <bdi>{r.team.name}</bdi>
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 font-bold text-ink">
                          <bdi>{r.event.title}</bdi>
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="size-3.5" /> {range(r.event.startAt, r.event.endAt, locale)}
                          </span>
                          {r.event.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3.5" /> {r.event.location}
                            </span>
                          )}
                        </p>
                      </Link>
                    </li>
                  );
                })}
                {y.trips.map((r) => (
                  <li key={r.id} className="relative">
                    <span className="absolute top-3 -start-[1.4rem] size-3 rounded-full bg-sky ring-4 ring-surface" aria-hidden />
                    <Link href={`/dashboard/trips/${r.trip.id}`} className="card-hover flex items-center justify-between gap-3 rounded-2xl border border-line p-3">
                      <span className="min-w-0">
                        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-sky-700">
                          <Bus className="size-3.5" /> {t("trip")}
                        </span>
                        <span className="block truncate font-bold text-ink">{r.trip.title}</span>
                        <span className="block text-xs text-muted">
                          {formatDate(r.trip.departAt, locale)} · {r.trip.destination}
                        </span>
                      </span>
                      <StatusBadge status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

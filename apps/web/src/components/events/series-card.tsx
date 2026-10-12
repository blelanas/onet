import { useLocale, useTranslations } from "use-intl";
import { CalendarDays, Layers } from "lucide-react";
import type { seriesListPage } from "@api/modules/events/series";
import { Link } from "@/lib/router";
import type { Loaded } from "@/lib/types";
import { CoverArt } from "@/components/ui/cover-art";
import { PhaseBadge, SeriesKindIcon, seriesNames, useDateRange, useEditionLabel } from "./series-visuals";

export type SeriesCardData = Loaded<typeof seriesListPage>["series"][number];

/** A programme (series) card: cover/colour, names (Arabic first in Arabic), kind, latest edition, editions count. */
export function SeriesCard({ s }: { s: SeriesCardData }) {
  const t = useTranslations("events.series");
  const tc = useTranslations("common");
  const locale = useLocale();
  const names = seriesNames(s, locale);
  const editionLabel = useEditionLabel();
  const range = useDateRange();
  const latest = s.latestEdition;
  return (
    <Link href={`/dashboard/events/series/${s.id}`} className="card card-hover group flex h-full flex-col overflow-hidden focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none">
      <CoverArt src={s.coverUrl} seed={s.id} color={s.color} className="h-36 shrink-0 sm:h-40">
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-surface/95 px-2.5 py-0.5 text-xs font-extrabold shadow-[var(--shadow-soft)]" style={{ color: s.color }}>
            <SeriesKindIcon kind={s.kind} className="size-3.5" /> {tc(`enums.SERIES_KINDS.${s.kind}`)}
          </span>
          {!s.isActive && <span className="rounded-full bg-black/45 px-2.5 py-0.5 text-xs font-bold text-white">{t("inactive")}</span>}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3 text-white">
          <h3 className="line-clamp-2 font-display text-xl leading-tight font-extrabold drop-shadow sm:text-2xl" lang={locale === "ar" && s.nameAr ? "ar" : undefined}>
            {names.primary}
          </h3>
        </div>
      </CoverArt>
      <div className="flex flex-1 flex-col gap-3 p-4">
        {names.secondary && (
          <p className="truncate text-sm font-bold text-ink-2">
            <bdi lang={names.secondaryIsAr ? "ar" : undefined}>{names.secondary}</bdi>
          </p>
        )}
        {latest ? (
          <div className="rounded-2xl border border-line bg-surface-2/50 p-3">
            <p className="mb-1 flex items-center justify-between gap-2 text-[11px] font-extrabold tracking-wide text-muted uppercase">
              {t("latest")}
              <PhaseBadge e={latest} />
            </p>
            <p className="truncate font-bold text-ink group-hover:text-brand-700">{latest.title}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
              <CalendarDays className="size-3.5 shrink-0" />
              <span className="truncate">
                {editionLabel(s.kind, latest)} · {range(latest.startAt, latest.endAt, locale)}
              </span>
            </p>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-line p-3 text-sm text-muted">{t("noEdition")}</p>
        )}
        <p className="mt-auto flex items-center gap-1.5 text-sm font-bold text-ink-2">
          <Layers className="size-4 text-muted" /> {t("editions", { count: s.editionsCount })}
        </p>
      </div>
    </Link>
  );
}

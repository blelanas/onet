import { useLocale, useTranslations } from "use-intl";
import { Clock, MapPin, Mic, UserRound } from "lucide-react";
import { FilterChips } from "@/components/ui/toolbar";
import { AudioPlayer } from "@/components/ui/audio-player";
import { EmptyState } from "@/components/ui/empty-state";
import { CONFERENCE_CATEGORIES } from "@onet/shared";
import { PageHero, SectionHeading } from "@/components/public/page-hero";
import { CategoryIcon, categoryColor } from "@/components/public/category";
import { PageBody, one } from "@/components/public/list-parts";
import { clock, dayMonth, longDate } from "@/components/public/format";
import { ResultsQueryView } from "@/components/public/states";
import type { PublicConference } from "@api/modules/public/queries";
import type { publicConferences } from "@api/modules/public/routes";
import type { Loaded } from "@/lib/types";
import { assetUrl } from "@/lib/api";
import { useApi } from "@/lib/query";
import { useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import { cn } from "@/lib/utils";

type Data = Loaded<typeof publicConferences>;

function ConferenceCard({ c, past }: { c: PublicConference; past?: boolean }) {
  const t = useTranslations("public.conferences");
  const tc = useTranslations("common");
  const locale = useLocale();
  const color = categoryColor(c.category);
  const { day, month } = dayMonth(c.date, locale);
  return (
    <article className="flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-soft)] sm:flex-row">
      <div className={cn("relative flex shrink-0 items-center gap-4 p-5 text-white sm:w-44 sm:flex-col sm:justify-center sm:text-center", past && "opacity-90")} style={{ background: `linear-gradient(160deg, ${color}, ${color}B3)` }}>
        <div>
          <p className="font-display text-5xl leading-none font-extrabold" dir="ltr">
            {day}
          </p>
          <p className="text-sm font-extrabold tracking-wider uppercase">{month}</p>
        </div>
        <CategoryIcon category={c.category} className="ms-auto size-10 opacity-80 sm:ms-0 sm:mt-3" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
        <span className="w-fit rounded-full px-2.5 py-0.5 text-xs font-extrabold" style={{ background: `${color}1A`, color }}>
          {tc(`enums.conferenceCategory.${c.category}`)}
        </span>
        <h3 className="mt-2 text-xl leading-snug font-extrabold text-ink">{c.title}</h3>
        {c.description && <p dir="auto" className="mt-1.5 text-sm text-muted">{c.description}</p>}
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-surface-2 p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full text-white" style={{ background: color }}>
            <UserRound className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-muted uppercase">{t("speaker")}</p>
            <p className="font-extrabold text-ink">{c.speaker}</p>
            {c.speakerBio && <p dir="auto" className="text-sm text-muted">{c.speakerBio}</p>}
          </div>
        </div>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-2">
          <li className="flex items-center gap-1.5">
            <Clock className="size-4 text-muted" aria-hidden />
            <time dateTime={c.date.toISOString()}>
              {longDate(c.date, locale)} · <span dir="ltr">{clock(c.date, locale)}</span>
            </time>
          </li>
          {c.location && (
            <li className="flex items-center gap-1.5">
              <MapPin className="size-4 text-muted" aria-hidden /> {c.location}
            </li>
          )}
          {!past && <li className="rounded-full bg-leaf-soft px-2.5 py-0.5 text-xs font-extrabold text-emerald-700">{t("free")}</li>}
        </ul>
        {past &&
          (c.mediaUrl ? (
            c.mediaType === "VIDEO" ? (
              <div className="mt-4">
                <p className="mb-2 text-sm font-extrabold text-ink">{t("watch")}</p>
                <video src={assetUrl(c.mediaUrl)} controls preload="metadata" className="w-full rounded-2xl bg-ink" />
              </div>
            ) : (
              <div className="mt-4">
                <p className="mb-2 text-sm font-extrabold text-ink">{t("listen")}</p>
                <AudioPlayer src={c.mediaUrl} title={c.title} subtitle={c.speaker} color={color} />
              </div>
            )
          ) : (
            <p className="mt-4 text-sm text-muted">{t("noRecording")}</p>
          ))}
      </div>
    </article>
  );
}

export function Component() {
  const params = useSearchParamsObject();
  const category = one(params.category);
  const t = useTranslations("public.conferences");
  const tm = useTranslations("public.meta.conferences");
  const tn = useTranslations("public.nav");
  const tp = useTranslations("public.common");
  const tc = useTranslations("common");
  usePageTitle(tm("title"));
  const query = useApi<Data>("/public/conferences", { category });

  return (
    <>
      <PageHero title={tm("title")} subtitle={tm("description")} color="#00A3A3" icon={<Mic />} crumbs={[{ href: "/", label: tn("home") }]} />
      <PageBody>
        <FilterChips
          className="mb-8"
          param="category"
          allLabel={tp("allCategories")}
          options={CONFERENCE_CATEGORIES.map((c) => ({ value: c, label: tc(`enums.conferenceCategory.${c}`), color: categoryColor(c) }))}
        />
        <ResultsQueryView query={query}>
          {({ upcoming, past }) => (
            <>
              <section aria-labelledby="upcoming-title">
                <SectionHeading id="upcoming-title" title={t("upcoming")} color="#00A3A3" />
                {upcoming.length ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {upcoming.map((c) => (
                      <ConferenceCard key={c.id} c={c} />
                    ))}
                  </div>
                ) : (
                  <div className="card">
                    <EmptyState compact title={tp("emptyTitle")} description={t("emptyUpcoming")} />
                  </div>
                )}
              </section>
              {past.length > 0 && (
                <section aria-labelledby="past-title" className="pt-14">
                  <SectionHeading id="past-title" title={t("past")} color="#7C4DFF" />
                  <div className="grid gap-4 lg:grid-cols-2">
                    {past.map((c) => (
                      <ConferenceCard key={c.id} c={c} past />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </ResultsQueryView>
      </PageBody>
    </>
  );
}

import { useLocale, useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { ArrowRight, MapPin, Mic2, Plus } from "lucide-react";
import type { conferencesPage } from "@api/modules/content/routes";
import { useApi } from "@/lib/query";
import { useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { CATEGORY_COLORS, CONFERENCE_CATEGORIES } from "@onet/shared";
import { formatDate } from "@onet/shared";
import { QueryView } from "@/components/states/page-state";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses, LinkButton } from "@/components/ui/button";
import { CoverArt } from "@/components/ui/cover-art";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { LinkTabs } from "@/components/ui/tabs";
import { FilterChips, SearchBox } from "@/components/ui/toolbar";
import { ContentHero } from "@/components/content/shared/content-hero";
import { ConferenceCard, speakerNames, timeOf } from "@/components/content/conferences/conference-card";

type Data = Loaded<typeof conferencesPage>;

/** /dashboard/content/conferences */
export function Component() {
  const t = useTranslations("content.conferences");
  usePageTitle(t("title"));
  const params = useSearchParamsObject();
  const query = useApi<Data>("/content/conferences", params);
  return <QueryView query={query}>{(data) => <ConferencesPage data={data} params={params} />}</QueryView>;
}

function ConferencesPage({ data, params }: { data: Data; params: Record<string, string | undefined> }) {
  const t = useTranslations("content");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const { rows, total, upcomingCount, pastCount, page, pageSize, when, canManage } = data;
  const filters = { q: params.q, category: params.category };

  const keep = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]);
  const tabHref = (w: string) => {
    const q = new URLSearchParams(keep);
    if (w === "past") q.set("when", "past");
    const s = q.toString();
    return `/dashboard/content/conferences${s ? `?${s}` : ""}`;
  };

  // Spotlight the very next conference on the first page of "upcoming".
  const spotlight = when === "upcoming" && page === 1 && !filters.q ? rows[0] : undefined;
  const rest = spotlight ? rows.slice(1) : rows;
  const days = spotlight ? Math.max(0, Math.round((new Date(spotlight.date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000)) : 0;

  return (
    <>
      <ContentHero
        theme="conferences"
        icon={<Mic2 />}
        eyebrow={tn("sections.content")}
        title={t("conferences.title")}
        description={t("conferences.description")}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("conferences.title") }]}
        actions={
          canManage && (
            <LinkButton href="/dashboard/content/conferences/new" className="h-11 rounded-full bg-white text-ink shadow-lg hover:bg-white/90">
              <Plus className="size-4" /> {t("conferences.new")}
            </LinkButton>
          )
        }
      />

      <LinkTabs
        active={when}
        tabs={[
          { key: "upcoming", label: t("conferences.upcoming"), href: tabHref("upcoming"), count: upcomingCount },
          { key: "past", label: t("conferences.past"), href: tabHref("past"), count: pastCount },
        ]}
      />
      <FilterChips
        param="category"
        allLabel={t("common.allCategories")}
        options={CONFERENCE_CATEGORIES.map((c) => ({ value: c, label: tc(`enums.conferenceCategory.${c}`), color: CATEGORY_COLORS[c] }))}
        className="mb-3"
      />
      <div className="mb-5">
        <SearchBox placeholder={t("conferences.searchPlaceholder")} />
      </div>

      {spotlight && (
        <Link href={`/dashboard/content/conferences/${spotlight.id}`} className="card card-hover group mb-6 grid overflow-hidden md:grid-cols-5">
          <CoverArt src={spotlight.coverUrl} seed={spotlight.id} color={CATEGORY_COLORS[spotlight.category] ?? "#1E9BD7"} icon={<Mic2 />} className="aspect-[16/9] md:col-span-2 md:aspect-auto md:min-h-60">
            <span className="absolute start-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-brand-700 shadow">{t("conferences.inDays", { count: days })}</span>
          </CoverArt>
          <div className="flex flex-col justify-center gap-3 p-5 sm:p-7 md:col-span-3">
            <p className="text-xs font-extrabold tracking-wide text-brand-600 uppercase">{t("conferences.next")}</p>
            <h2 dir="auto" className="ltr:text-left rtl:text-right text-2xl leading-tight font-extrabold text-ink group-hover:text-brand-700 sm:text-3xl">{spotlight.title}</h2>
            <p className="text-sm font-bold text-ink-2">
              {formatDate(spotlight.date, locale, "long")} · <span className="tabular-nums">{timeOf(spotlight.date, locale)}</span>
            </p>
            {spotlight.location && (
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <MapPin className="size-4" /> {spotlight.location}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="flex items-center gap-2">
                <Avatar {...speakerNames(spotlight.speaker)} />
                <span className="text-sm font-extrabold text-ink">{spotlight.speaker}</span>
              </span>
              <span className={buttonClasses("soft", "sm")}>
                {tc("actions.details")} <ArrowRight className="rtl-flip size-4" />
              </span>
            </div>
          </div>
        </Link>
      )}

      {rest.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rest.map((c) => (
            <ConferenceCard key={c.id} conf={c} past={when === "past"} />
          ))}
        </div>
      ) : (
        !spotlight && (
          <div className="card">
            <EmptyState
              icon={<Mic2 className="size-4" />}
              title={filters.q || filters.category ? t("common.emptyFiltered") : when === "past" ? t("conferences.emptyPast") : t("conferences.emptyUpcoming")}
              description={filters.q || filters.category ? tc("states.noResultsHint") : t("conferences.emptyText")}
              action={canManage && !filters.q ? <LinkButton href="/dashboard/content/conferences/new"><Plus className="size-4" /> {t("conferences.new")}</LinkButton> : undefined}
            />
          </div>
        )
      )}
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/dashboard/content/conferences" searchParams={params} />
    </>
  );
}

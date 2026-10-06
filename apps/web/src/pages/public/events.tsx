import { useTranslations } from "use-intl";
import { CalendarDays } from "lucide-react";
import type { publicEvents } from "@api/modules/public/routes";
import type { Loaded } from "@/lib/types";
import { useApi } from "@/lib/query";
import { useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import { FilterChips, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { Pagination, paging } from "@/components/ui/pagination";
import { EVENT_CATEGORIES } from "@onet/shared";
import { PageHero } from "@/components/public/page-hero";
import { EventCard } from "@/components/public/cards";
import { categoryColor } from "@/components/public/category";
import { EmptyResults, PageBody, ResultsCount, WhenTabs, one } from "@/components/public/list-parts";
import { ResultsQueryView } from "@/components/public/states";

type Data = Loaded<typeof publicEvents>;

// Staff-only categories are not offered as public filters.
const PUBLIC_CATEGORIES = EVENT_CATEGORIES.filter((c) => c !== "MEETING");

export function Component() {
  const params = useSearchParamsObject();
  const q = one(params.q);
  const category = one(params.category);
  const when = one(params.when) === "past" ? "past" : "upcoming";
  const { page } = paging(params, 9);
  const t = useTranslations("public.common");
  const tm = useTranslations("public.meta.events");
  const tn = useTranslations("public.nav");
  const tc = useTranslations("common");
  usePageTitle(tm("title"));
  const query = useApi<Data>("/public/events", { q, category, when: when === "past" ? "past" : undefined, page: page > 1 ? page : undefined });

  return (
    <>
      <PageHero title={tm("title")} subtitle={tm("description")} color="#FF6B4A" icon={<CalendarDays />} crumbs={[{ href: "/", label: tn("home") }]} />
      <PageBody>
        <Toolbar>
          <WhenTabs base="/events" when={when} params={params} labels={{ upcoming: t("upcoming"), past: t("pastTab") }} />
          <SearchBox placeholder={t("searchEvents")} className="sm:ms-auto" />
        </Toolbar>
        <FilterChips
          className="mb-6"
          param="category"
          allLabel={t("allCategories")}
          options={PUBLIC_CATEGORIES.map((c) => ({ value: c, label: tc(`enums.eventCategory.${c}`), color: categoryColor(c) }))}
        />
        <ResultsQueryView query={query}>
          {({ rows, total, pageSize }) => (
            <>
              <ResultsCount count={total} />
              {rows.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rows.map((e) => (
                    <EventCard key={e.id} event={e} headingLevel={2} />
                  ))}
                </div>
              ) : (
                <EmptyResults resetHref="/events" filtered={!!(q || category)} description={when === "upcoming" ? t("emptyUpcomingEvents") : undefined} />
              )}
              <Pagination page={page} pageSize={pageSize} total={total} basePath="/events" searchParams={params} />
            </>
          )}
        </ResultsQueryView>
      </PageBody>
    </>
  );
}

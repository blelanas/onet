import { useTranslations } from "use-intl";
import { Tent } from "lucide-react";
import type { publicTrips } from "@api/modules/public/routes";
import type { Loaded } from "@/lib/types";
import { useApi } from "@/lib/query";
import { useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import { FilterChips, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { Pagination, paging } from "@/components/ui/pagination";
import { TRIP_CATEGORIES } from "@onet/shared";
import { PageHero } from "@/components/public/page-hero";
import { TripCard } from "@/components/public/cards";
import { categoryColor } from "@/components/public/category";
import { EmptyResults, PageBody, ResultsCount, WhenTabs, one } from "@/components/public/list-parts";
import { ResultsQueryView } from "@/components/public/states";

type Data = Loaded<typeof publicTrips>;

export function Component() {
  const params = useSearchParamsObject();
  const q = one(params.q);
  const category = one(params.category);
  const when = one(params.when) === "past" ? "past" : "upcoming";
  const { page } = paging(params, 9);
  const t = useTranslations("public.common");
  const tm = useTranslations("public.meta.trips");
  const tn = useTranslations("public.nav");
  const tc = useTranslations("common");
  usePageTitle(tm("title"));
  const query = useApi<Data>("/public/trips", { q, category, when: when === "past" ? "past" : undefined, page: page > 1 ? page : undefined });

  return (
    <>
      <PageHero title={tm("title")} subtitle={tm("description")} color="#1E9BD7" icon={<Tent />} crumbs={[{ href: "/", label: tn("home") }]} />
      <PageBody>
        <Toolbar>
          <WhenTabs base="/trips" when={when} params={params} labels={{ upcoming: t("upcoming"), past: t("pastTab") }} />
          <SearchBox placeholder={t("searchTrips")} className="sm:ms-auto" />
        </Toolbar>
        <FilterChips
          className="mb-6"
          param="category"
          allLabel={t("allCategories")}
          options={TRIP_CATEGORIES.map((c) => ({ value: c, label: tc(`enums.tripCategory.${c}`), color: categoryColor(c) }))}
        />
        <ResultsQueryView query={query}>
          {({ rows, total, pageSize }) => (
            <>
              <ResultsCount count={total} />
              {rows.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rows.map((tr) => (
                    <TripCard key={tr.id} trip={tr} headingLevel={2} />
                  ))}
                </div>
              ) : (
                <EmptyResults resetHref="/trips" filtered={!!(q || category)} description={when === "upcoming" ? t("emptyUpcomingTrips") : undefined} />
              )}
              <Pagination page={page} pageSize={pageSize} total={total} basePath="/trips" searchParams={params} />
            </>
          )}
        </ResultsQueryView>
      </PageBody>
    </>
  );
}

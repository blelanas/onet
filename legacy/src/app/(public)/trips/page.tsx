import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Tent } from "lucide-react";
import { FilterChips, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { Pagination, paging } from "@/components/ui/pagination";
import { TRIP_CATEGORIES } from "@/lib/constants";
import { listPublicTrips } from "@/server/public/queries";
import { PageHero } from "@/components/public/page-hero";
import { TripCard } from "@/components/public/cards";
import { categoryColor } from "@/components/public/category";
import { EmptyResults, PageBody, ResultsCount, WhenTabs, one, type SP } from "@/components/public/list-parts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("public.meta.trips");
  return { title: t("title"), description: t("description") };
}

export default async function TripsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const params = await searchParams;
  const q = one(params.q);
  const category = one(params.category);
  const when = one(params.when) === "past" ? "past" : "upcoming";
  const { page, pageSize, skip, take } = paging(params, 9);
  const [t, tm, tn, tc, { rows, total }] = await Promise.all([
    getTranslations("public.common"),
    getTranslations("public.meta.trips"),
    getTranslations("public.nav"),
    getTranslations("common"),
    listPublicTrips({ q, category, when, skip, take }),
  ]);

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
      </PageBody>
    </>
  );
}

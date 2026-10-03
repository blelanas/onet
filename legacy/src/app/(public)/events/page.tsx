import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CalendarDays } from "lucide-react";
import { FilterChips, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { Pagination, paging } from "@/components/ui/pagination";
import { EVENT_CATEGORIES } from "@/lib/constants";
import { listPublicEvents } from "@/server/public/queries";
import { PageHero } from "@/components/public/page-hero";
import { EventCard } from "@/components/public/cards";
import { categoryColor } from "@/components/public/category";
import { EmptyResults, PageBody, ResultsCount, WhenTabs, one, type SP } from "@/components/public/list-parts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("public.meta.events");
  return { title: t("title"), description: t("description") };
}

// Staff-only categories are not offered as public filters.
const PUBLIC_CATEGORIES = EVENT_CATEGORIES.filter((c) => c !== "MEETING");

export default async function EventsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const params = await searchParams;
  const q = one(params.q);
  const category = one(params.category);
  const when = one(params.when) === "past" ? "past" : "upcoming";
  const { page, pageSize, skip, take } = paging(params, 9);
  const [t, tm, tn, tc, { rows, total }] = await Promise.all([
    getTranslations("public.common"),
    getTranslations("public.meta.events"),
    getTranslations("public.nav"),
    getTranslations("common"),
    listPublicEvents({ q, category, when, skip, take }),
  ]);

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
      </PageBody>
    </>
  );
}

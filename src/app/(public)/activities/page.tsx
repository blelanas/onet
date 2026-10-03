import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Palette } from "lucide-react";
import { FilterChips, FilterSelect, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { ACTIVITY_CATEGORIES } from "@/lib/constants";
import { listPublicActivities } from "@/server/public/queries";
import { PageHero } from "@/components/public/page-hero";
import { ActivityCard } from "@/components/public/cards";
import { categoryColor } from "@/components/public/category";
import { EmptyResults, PageBody, ResultsCount, one, type SP } from "@/components/public/list-parts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("public.meta.activities");
  return { title: t("title"), description: t("description") };
}

export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const params = await searchParams;
  const q = one(params.q);
  const category = one(params.category);
  const ageRaw = Number(one(params.age));
  const age = Number.isInteger(ageRaw) && ageRaw >= 3 && ageRaw <= 18 ? ageRaw : undefined;
  const [t, tm, tn, tc, rows] = await Promise.all([
    getTranslations("public.common"),
    getTranslations("public.meta.activities"),
    getTranslations("public.nav"),
    getTranslations("common"),
    listPublicActivities({ q, category: category && (ACTIVITY_CATEGORIES as readonly string[]).includes(category) ? category : undefined, age }),
  ]);

  return (
    <>
      <PageHero title={tm("title")} subtitle={tm("description")} color="#2BB673" icon={<Palette />} crumbs={[{ href: "/", label: tn("home") }]} />
      <PageBody>
        <Toolbar>
          <SearchBox placeholder={t("searchActivities")} />
          <FilterSelect param="age" allLabel={t("anyAge")} options={Array.from({ length: 14 }, (_, i) => i + 4).map((a) => ({ value: String(a), label: t("ageOption", { age: a }) }))} />
        </Toolbar>
        <FilterChips
          className="mb-6"
          param="category"
          allLabel={t("allCategories")}
          options={ACTIVITY_CATEGORIES.map((c) => ({ value: c, label: tc(`enums.activityCategory.${c}`), color: categoryColor(c) }))}
        />
        <ResultsCount count={rows.length} />
        {rows.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((a) => (
              <ActivityCard key={a.id} activity={a} headingLevel={2} />
            ))}
          </div>
        ) : (
          <EmptyResults resetHref="/activities" filtered={!!(q || category || age)} />
        )}
      </PageBody>
    </>
  );
}

import { useTranslations } from "use-intl";
import { Palette } from "lucide-react";
import type { publicActivities } from "@api/modules/public/routes";
import type { Loaded } from "@/lib/types";
import { useApi } from "@/lib/query";
import { useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import { FilterChips, FilterSelect, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { ACTIVITY_CATEGORIES } from "@onet/shared";
import { PageHero } from "@/components/public/page-hero";
import { ActivityCard } from "@/components/public/cards";
import { categoryColor } from "@/components/public/category";
import { EmptyResults, PageBody, ResultsCount, one } from "@/components/public/list-parts";
import { ResultsQueryView } from "@/components/public/states";

type Data = Loaded<typeof publicActivities>;

export function Component() {
  const params = useSearchParamsObject();
  const q = one(params.q);
  const category = one(params.category);
  const ageRaw = Number(one(params.age));
  const age = Number.isInteger(ageRaw) && ageRaw >= 3 && ageRaw <= 18 ? ageRaw : undefined;
  const t = useTranslations("public.common");
  const tm = useTranslations("public.meta.activities");
  const tn = useTranslations("public.nav");
  const tc = useTranslations("common");
  usePageTitle(tm("title"));
  const query = useApi<Data>("/public/activities", { q, category, age });

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
        <ResultsQueryView query={query}>
          {({ rows }) => (
            <>
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
            </>
          )}
        </ResultsQueryView>
      </PageBody>
    </>
  );
}

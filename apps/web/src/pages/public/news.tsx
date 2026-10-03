import { useTranslations } from "use-intl";
import { Newspaper } from "lucide-react";
import type { publicNewsList } from "@api/modules/public/routes";
import type { Loaded } from "@/lib/types";
import { useApi } from "@/lib/query";
import { useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import { FilterChips, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { Pagination, paging } from "@/components/ui/pagination";
import { PageHero } from "@/components/public/page-hero";
import { NewsCard } from "@/components/public/cards";
import { categoryColor } from "@/components/public/category";
import { EmptyResults, PageBody, ResultsCount, one } from "@/components/public/list-parts";
import { ResultsQueryView } from "@/components/public/states";

type Data = Loaded<typeof publicNewsList>;

export function Component() {
  const params = useSearchParamsObject();
  const q = one(params.q);
  const category = one(params.category);
  const { page } = paging(params, 9);
  const t = useTranslations("public.common");
  const tm = useTranslations("public.meta.news");
  const tn = useTranslations("public.nav");
  const tcat = useTranslations("public.newsCategory");
  usePageTitle(tm("title"));
  const query = useApi<Data>("/public/news", { q, category, page: page > 1 ? page : undefined });
  const cats = query.data?.cats ?? [];

  return (
    <>
      <PageHero title={tm("title")} subtitle={tm("description")} color="#7C4DFF" icon={<Newspaper />} crumbs={[{ href: "/", label: tn("home") }]} />
      <PageBody>
        <Toolbar>
          <SearchBox placeholder={t("searchNews")} />
        </Toolbar>
        {cats.length > 1 && (
          <FilterChips
            className="mb-6"
            param="category"
            allLabel={t("allCategories")}
            options={cats.map((c) => ({ value: c, label: tcat.has(c) ? tcat(c) : c, color: categoryColor(c) }))}
          />
        )}
        <ResultsQueryView query={query}>
          {({ rows, total, pageSize }) => {
            // The newest article gets a large "featured" card on the unfiltered first page.
            const featured = page === 1 && !q && !category ? rows[0] : undefined;
            const rest = featured ? rows.slice(1) : rows;
            return (
              <>
                <ResultsCount count={total} />
                {rows.length ? (
                  <div className="space-y-4">
                    {featured && <NewsCard post={featured} headingLevel={2} featured />}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {rest.map((n) => (
                        <NewsCard key={n.id} post={n} headingLevel={2} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyResults resetHref="/news" filtered={!!(q || category)} />
                )}
                <Pagination page={page} pageSize={pageSize} total={total} basePath="/news" searchParams={params} />
              </>
            );
          }}
        </ResultsQueryView>
      </PageBody>
    </>
  );
}

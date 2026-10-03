import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Newspaper } from "lucide-react";
import { FilterChips, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { Pagination, paging } from "@/components/ui/pagination";
import { listPublicNews, newsCategories } from "@/server/public/queries";
import { PageHero } from "@/components/public/page-hero";
import { NewsCard } from "@/components/public/cards";
import { categoryColor } from "@/components/public/category";
import { EmptyResults, PageBody, ResultsCount, one, type SP } from "@/components/public/list-parts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("public.meta.news");
  return { title: t("title"), description: t("description") };
}

export default async function NewsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const params = await searchParams;
  const q = one(params.q);
  const category = one(params.category);
  const { page, pageSize, skip, take } = paging(params, 9);
  const [t, tm, tn, tcat, cats, { rows, total }] = await Promise.all([
    getTranslations("public.common"),
    getTranslations("public.meta.news"),
    getTranslations("public.nav"),
    getTranslations("public.newsCategory"),
    newsCategories(),
    listPublicNews({ q, category, skip, take }),
  ]);
  // The newest article gets a large "featured" card on the unfiltered first page.
  const featured = page === 1 && !q && !category ? rows[0] : undefined;
  const rest = featured ? rows.slice(1) : rows;

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
      </PageBody>
    </>
  );
}

import { useLocale, useTranslations } from "use-intl";
import type { publicNewsArticle } from "@api/modules/public/routes";
import type { Loaded } from "@/lib/types";
import { useApi } from "@/lib/query";
import { Link, useParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import { PublicQueryView } from "@/components/public/states";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { categoryColor } from "@/components/public/category";
import { DetailHero, Prose } from "@/components/public/detail-parts";
import { NewsCard } from "@/components/public/cards";
import { SectionHeading } from "@/components/public/page-hero";
import { longDate, paragraphs } from "@/components/public/format";

type Data = Loaded<typeof publicNewsArticle>;

export function Component() {
  const { slug } = useParams();
  const query = useApi<Data>(`/public/news/${encodeURIComponent(slug ?? "")}`);
  usePageTitle(query.data?.post.title);
  return <PublicQueryView query={query}>{(data) => <NewsArticlePage data={data} />}</PublicQueryView>;
}

function NewsArticlePage({ data }: { data: Data }) {
  const locale = useLocale();
  const tn = useTranslations("public.nav");
  const tcat = useTranslations("public.newsCategory");
  const td = useTranslations("public.details");
  const { post, related } = data;
  const color = categoryColor(post.category);

  return (
    <article>
      <DetailHero
        seed={post.slug}
        src={post.coverUrl}
        color={color}
        category={post.category}
        categoryLabel={tcat.has(post.category) ? tcat(post.category) : post.category}
        title={post.title}
        crumbs={[
          { href: "/", label: tn("home") },
          { href: "/news", label: tn("news") },
        ]}
      >
        <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-white/90">
          <CalendarDays className="size-4" aria-hidden />
          <time dateTime={post.publishedAt.toISOString()}>{longDate(post.publishedAt, locale)}</time>
        </p>
      </DetailHero>

      <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
        {post.excerpt && (
          <p className="mb-8 border-s-4 ps-5 font-display text-xl leading-relaxed font-bold text-ink sm:text-2xl" style={{ borderColor: color }}>
            {post.excerpt}
          </p>
        )}
        <Prose paragraphs={paragraphs(post.body)} className="text-lg" />
        <div className="mt-10 border-t border-line pt-6">
          <Link href="/news" className={buttonClasses("outline", "md", "rounded-full")}>
            <ArrowLeft className="rtl-flip size-4" /> {td("allNews")}
          </Link>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
          <SectionHeading id="related-title" title={td("moreNews")} href="/news" linkLabel={td("allNews")} color={color} />
          <div className="grid gap-4 md:grid-cols-3">
            {related.map((n) => (
              <NewsCard key={n.id} post={n} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

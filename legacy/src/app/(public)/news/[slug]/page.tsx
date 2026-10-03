import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { getPublicNews } from "@/server/public/queries";
import { buttonClasses } from "@/components/ui/button";
import { categoryColor } from "@/components/public/category";
import { DetailHero, Prose } from "@/components/public/detail-parts";
import { NewsCard } from "@/components/public/cards";
import { SectionHeading } from "@/components/public/page-hero";
import { longDate, paragraphs } from "@/components/public/format";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicNews(decodeURIComponent(slug));
  if (!data) return {};
  const desc = (data.post.excerpt ?? data.post.body).slice(0, 160);
  return {
    title: data.post.title,
    description: desc,
    openGraph: { title: data.post.title, description: desc, type: "article", publishedTime: data.post.publishedAt.toISOString() },
  };
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;
  const [data, locale, tn, tcat, td] = await Promise.all([
    getPublicNews(decodeURIComponent(slug)),
    getLocale(),
    getTranslations("public.nav"),
    getTranslations("public.newsCategory"),
    getTranslations("public.details"),
  ]);
  if (!data) notFound();
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

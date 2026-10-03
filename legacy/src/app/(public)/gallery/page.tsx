import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Images } from "lucide-react";
import { FilterChips } from "@/components/ui/toolbar";
import { galleryAlbums, listGallery } from "@/server/public/queries";
import { PageHero } from "@/components/public/page-hero";
import { GalleryGrid } from "@/components/public/gallery-grid";
import { categoryColor } from "@/components/public/category";
import { EmptyResults, PageBody, one, type SP } from "@/components/public/list-parts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("public.meta.gallery");
  return { title: t("title"), description: t("description") };
}

export default async function GalleryPage({ searchParams }: { searchParams: Promise<SP> }) {
  const params = await searchParams;
  const album = one(params.album);
  const [t, tm, tn, ta, tg, albums, items] = await Promise.all([
    getTranslations("public.common"),
    getTranslations("public.meta.gallery"),
    getTranslations("public.nav"),
    getTranslations("public.album"),
    getTranslations("public.gallery"),
    galleryAlbums(),
    listGallery({ album, take: 200 }),
  ]);
  const total = albums.reduce((s, a) => s + a.count, 0);

  return (
    <>
      <PageHero title={tm("title")} subtitle={tm("description")} color="#D97706" icon={<Images />} crumbs={[{ href: "/", label: tn("home") }]}>
        <p className="inline-flex rounded-full bg-white/20 px-3 py-1 text-sm font-extrabold ring-1 ring-white/30">{tg("photos", { count: total })}</p>
      </PageHero>
      <PageBody>
        {albums.length > 1 && (
          <FilterChips
            className="mb-6"
            param="album"
            allLabel={t("allCategories")}
            options={albums.map((a) => ({ value: a.album, label: `${ta.has(a.album) ? ta(a.album) : a.album} · ${a.count}`, color: categoryColor(a.album) }))}
          />
        )}
        {items.length ? <GalleryGrid items={items} /> : <EmptyResults resetHref="/gallery" filtered={!!album} />}
      </PageBody>
    </>
  );
}

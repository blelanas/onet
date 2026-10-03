import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Music } from "lucide-react";
import { FilterChips, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { SONG_CATEGORIES } from "@/lib/constants";
import { listPublicSongs } from "@/server/public/queries";
import { PageHero } from "@/components/public/page-hero";
import { SongBrowser } from "@/components/public/song-browser";
import { categoryColor } from "@/components/public/category";
import { EmptyResults, PageBody, ResultsCount, one, type SP } from "@/components/public/list-parts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("public.meta.songs");
  return { title: t("title"), description: t("description") };
}

export default async function SongsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const params = await searchParams;
  const q = one(params.q);
  const category = one(params.category);
  const [t, tm, tn, tc, songs] = await Promise.all([
    getTranslations("public.common"),
    getTranslations("public.meta.songs"),
    getTranslations("public.nav"),
    getTranslations("common"),
    listPublicSongs({ q, category }),
  ]);

  return (
    <>
      <PageHero title={tm("title")} subtitle={tm("description")} color="#E8457C" icon={<Music />} crumbs={[{ href: "/", label: tn("home") }]} />
      <PageBody>
        <Toolbar>
          <SearchBox placeholder={t("searchSongs")} />
        </Toolbar>
        <FilterChips
          className="mb-6"
          param="category"
          allLabel={t("allCategories")}
          options={SONG_CATEGORIES.map((c) => ({ value: c, label: tc(`enums.songCategory.${c}`), color: categoryColor(c) }))}
        />
        <ResultsCount count={songs.length} />
        {songs.length ? <SongBrowser key={`${q}-${category}`} songs={songs} /> : <EmptyResults resetHref="/songs" filtered={!!(q || category)} />}
      </PageBody>
    </>
  );
}

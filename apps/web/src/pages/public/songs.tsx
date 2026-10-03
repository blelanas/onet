import { useTranslations } from "use-intl";
import { Music } from "lucide-react";
import type { publicSongs } from "@api/modules/public/routes";
import type { Loaded } from "@/lib/types";
import { useApi } from "@/lib/query";
import { useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import { FilterChips, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { SONG_CATEGORIES } from "@onet/shared";
import { PageHero } from "@/components/public/page-hero";
import { SongBrowser } from "@/components/public/song-browser";
import { categoryColor } from "@/components/public/category";
import { EmptyResults, PageBody, ResultsCount, one } from "@/components/public/list-parts";
import { ResultsQueryView } from "@/components/public/states";

type Data = Loaded<typeof publicSongs>;

export function Component() {
  const params = useSearchParamsObject();
  const q = one(params.q);
  const category = one(params.category);
  const t = useTranslations("public.common");
  const tm = useTranslations("public.meta.songs");
  const tn = useTranslations("public.nav");
  const tc = useTranslations("common");
  usePageTitle(tm("title"));
  const query = useApi<Data>("/public/songs", { q, category });

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
        <ResultsQueryView query={query}>
          {({ rows: songs }) => (
            <>
              <ResultsCount count={songs.length} />
              {/* Keyed on the result set so the "now playing" panel resets when the filters change. */}
              {songs.length ? <SongBrowser key={songs.map((s) => s.id).join()} songs={songs} /> : <EmptyResults resetHref="/songs" filtered={!!(q || category)} />}
            </>
          )}
        </ResultsQueryView>
      </PageBody>
    </>
  );
}

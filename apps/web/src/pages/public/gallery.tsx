import { useTranslations } from "use-intl";
import { Images } from "lucide-react";
import type { publicGallery } from "@api/modules/public/routes";
import type { Loaded } from "@/lib/types";
import { useApi } from "@/lib/query";
import { useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import { FilterChips } from "@/components/ui/toolbar";
import { PageHero } from "@/components/public/page-hero";
import { GalleryGrid } from "@/components/public/gallery-grid";
import { categoryColor } from "@/components/public/category";
import { EmptyResults, PageBody, one } from "@/components/public/list-parts";
import { ResultsQueryView } from "@/components/public/states";

type Data = Loaded<typeof publicGallery>;

export function Component() {
  const params = useSearchParamsObject();
  const album = one(params.album);
  const t = useTranslations("public.common");
  const tm = useTranslations("public.meta.gallery");
  const tn = useTranslations("public.nav");
  const ta = useTranslations("public.album");
  const tg = useTranslations("public.gallery");
  usePageTitle(tm("title"));
  const query = useApi<Data>("/public/gallery", { album });
  const albums = query.data?.albums ?? [];
  const total = albums.reduce((s, a) => s + a.count, 0);

  return (
    <>
      <PageHero title={tm("title")} subtitle={tm("description")} color="#D97706" icon={<Images />} crumbs={[{ href: "/", label: tn("home") }]}>
        {query.data && <p className="inline-flex rounded-full bg-white/20 px-3 py-1 text-sm font-extrabold ring-1 ring-white/30">{tg("photos", { count: total })}</p>}
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
        <ResultsQueryView query={query}>{({ items }) => (items.length ? <GalleryGrid items={items} /> : <EmptyResults resetHref="/gallery" filtered={!!album} />)}</ResultsQueryView>
      </PageBody>
    </>
  );
}

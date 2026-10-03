import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Headphones, Music, Plus, Sparkles } from "lucide-react";
import { can, pageQuery, requirePagePermission } from "@/lib/auth/guards";
import { AGE_GROUPS, CATEGORY_COLORS, SONG_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { featuredSongs, listSongs, topSongs } from "@/server/content/songs";
import { sp } from "@/server/content/shared";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, paging } from "@/components/ui/pagination";
import { FilterChips, FilterSelect, SearchBox } from "@/components/ui/toolbar";
import { Carousel } from "@/components/content/shared/carousel";
import { ContentHero } from "@/components/content/shared/content-hero";
import { SongCard } from "@/components/content/songs/song-card";
import { SongCover, songAccent } from "@/components/content/songs/song-cover";
import { NowPlayingMark, PlayAllButtons, PlayButton } from "@/components/content/songs/play-button";
import { toTracks } from "@/components/content/songs/track";

export async function generateMetadata() {
  const t = await getTranslations("content.songs");
  return { title: t("title") };
}

type SP = Record<string, string | string[] | undefined>;

export default async function SongsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePagePermission("content.read");
  const params = await searchParams;
  const t = await getTranslations("content");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const isKid = user.roles.includes("kid") && user.roles.length === 1;
  const canManage = can(user, "content.manage");
  const filters = { q: sp(params, "q"), category: sp(params, "category"), age: sp(params, "age"), lang: sp(params, "lang") };
  const filtered = !!(filters.q || filters.category || filters.age || filters.lang);
  const { page, pageSize, skip, take } = paging(params, 24);

  const [{ rows, total }, featured, top] = await pageQuery(Promise.all([listSongs({ ...filters, skip, take }), filtered ? Promise.resolve([]) : featuredSongs(), filtered ? Promise.resolve([]) : topSongs(5)]));
  const tracks = toTracks(rows);
  const featuredTracks = toTracks(featured);
  const topTracks = toTracks(top);

  return (
    <>
      <ContentHero
        theme="songs"
        icon={<Music />}
        eyebrow={isKid ? t("songs.hello") : tn("sections.content")}
        title={t("songs.title")}
        description={t("songs.description")}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("songs.title") }]}
        actions={
          <>
            <PlayAllButtons tracks={tracks} onColor />
            {canManage && (
              <LinkButton href="/dashboard/content/songs/new" variant="outline" className="h-11 rounded-full border-white/40 bg-white/15 text-white hover:bg-white/25">
                <Plus className="size-4" /> {t("songs.new")}
              </LinkButton>
            )}
          </>
        }
      />

      {!filtered && featured.length > 0 && (
        <div className="mb-8 grid gap-6 xl:grid-cols-3">
          <Carousel title={<span className="flex items-center gap-2"><Sparkles className="size-5 text-sun" /> {t("songs.featured")}</span>} className="xl:col-span-2">
            {featured.map((s) => {
              const accent = songAccent(s.id);
              const rtl = s.language === "ar";
              return (
                <article key={s.id} className="group relative w-[78%] shrink-0 snap-start sm:w-[46%] xl:w-[calc(50%-0.5rem)]">
                  <div className="relative overflow-hidden rounded-3xl p-3 shadow-[var(--shadow-soft)]" style={{ background: `linear-gradient(160deg, ${accent}26, ${accent}0D)` }}>
                    <Link href={`/dashboard/content/songs/${s.id}`} className="block" tabIndex={-1} aria-hidden>
                      <SongCover seed={s.id} src={s.coverUrl} className="aspect-[4/3] shadow-lg transition duration-300 group-hover:scale-[1.02]" rounded="rounded-2xl" />
                    </Link>
                    <NowPlayingMark trackId={s.id} className="absolute start-5 top-5" />
                    <div className="mt-3 flex items-center gap-3 px-1 pb-1">
                      <Link href={`/dashboard/content/songs/${s.id}`} className="min-w-0 flex-1">
                        <h3 className={cn("line-clamp-1 text-lg font-extrabold text-ink", rtl && "font-[family-name:var(--font-arabic)]")}>
                          <bdi>{s.title}</bdi>
                        </h3>
                        <p className="line-clamp-1 text-sm text-muted">{s.author}</p>
                        <Badge color={CATEGORY_COLORS[s.category]} className="mt-1.5">{tc(`enums.songCategory.${s.category}`)}</Badge>
                      </Link>
                      {s.audioUrl && <PlayButton tracks={featuredTracks} trackId={s.id} title={s.title} size="lg" color={accent} />}
                    </div>
                  </div>
                </article>
              );
            })}
          </Carousel>

          {top.length > 0 && (
            <section className="card p-4 sm:p-5">
              <h2 className="mb-3 flex items-center gap-2 text-xl font-extrabold text-ink">
                <Headphones className="size-5 text-grape" /> {t("songs.topPlayed")}
              </h2>
              <ol className="space-y-1">
                {top.map((s, i) => (
                  <li key={s.id} className="group flex items-center gap-3 rounded-2xl p-1.5 transition hover:bg-surface-2">
                    <span className="w-5 text-center text-lg font-extrabold text-muted tabular-nums">{i + 1}</span>
                    <SongCover seed={s.id} src={s.coverUrl} className="size-12 shrink-0" rounded="rounded-xl" />
                    <Link href={`/dashboard/content/songs/${s.id}`} className="min-w-0 flex-1">
                      <p className={cn("truncate font-bold text-ink group-hover:text-brand-700", s.language === "ar" && "font-[family-name:var(--font-arabic)]")}>
                        <bdi>{s.title}</bdi>
                      </p>
                      <p className="truncate text-xs text-muted">{t("songs.plays", { count: s.plays })}</p>
                    </Link>
                    {s.audioUrl && <PlayButton tracks={topTracks} trackId={s.id} title={s.title} size="sm" color={songAccent(s.id)} />}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}

      <section aria-labelledby="all-songs">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 id="all-songs" className="text-xl font-extrabold text-ink">
            {filtered ? t("songs.results", { count: total }) : t("songs.all")}
          </h2>
          {filtered && (
            <Link href="/dashboard/content/songs" className="text-sm font-bold text-brand-600 hover:text-brand-700">
              {t("common.resetFilters")}
            </Link>
          )}
        </div>
        <FilterChips
          param="category"
          allLabel={t("common.allCategories")}
          options={SONG_CATEGORIES.map((c) => ({ value: c, label: tc(`enums.songCategory.${c}`), color: CATEGORY_COLORS[c] }))}
          className="mb-3"
        />
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchBox placeholder={t("songs.searchPlaceholder")} className="sm:max-w-sm" />
          <div className="flex gap-2">
            <FilterSelect param="age" allLabel={t("common.allAges")} options={AGE_GROUPS.map((a) => ({ value: a, label: tc(`enums.ageGroup.${a}`) }))} className="min-w-0 flex-1 sm:flex-none" />
            <FilterSelect param="lang" allLabel={t("songs.allLanguages")} options={(["ar", "fr", "en"] as const).map((l) => ({ value: l, label: t(`songs.languages.${l}`) }))} className="min-w-0 flex-1 sm:flex-none" />
          </div>
        </div>

        {rows.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {rows.map((s) => (
              <SongCard key={s.id} song={s} tracks={tracks} />
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState
              icon={<Music className="size-4" />}
              title={filtered ? t("common.emptyFiltered") : t("songs.emptyTitle")}
              description={filtered ? tc("states.noResultsHint") : t("songs.emptyText")}
              action={
                filtered ? (
                  <LinkButton href="/dashboard/content/songs" variant="outline">{t("common.resetFilters")}</LinkButton>
                ) : canManage ? (
                  <LinkButton href="/dashboard/content/songs/new"><Plus className="size-4" /> {t("songs.new")}</LinkButton>
                ) : undefined
              }
            />
          </div>
        )}
        <Pagination page={page} pageSize={pageSize} total={total} basePath="/dashboard/content/songs" searchParams={params} />
      </section>
    </>
  );
}

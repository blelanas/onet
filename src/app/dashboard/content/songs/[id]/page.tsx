import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Clock, Edit, Globe2, Headphones, Hash, Music, Smile, Tag, Trash2, User } from "lucide-react";
import { can, pageQuery, requirePagePermission } from "@/lib/auth/guards";
import { CATEGORY_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { getSong, relatedSongs } from "@/server/content/songs";
import { splitTags } from "@/server/content/shared";
import { deleteSong } from "@/server/content/song-actions";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Breadcrumbs } from "@/components/ui/page-header";
import { InfoList } from "@/components/ui/section";
import { SongCover, songAccent } from "@/components/content/songs/song-cover";
import { NowPlayingMark, PlayButton } from "@/components/content/songs/play-button";
import { LyricsView, PlaysCount } from "@/components/content/songs/lyrics-view";
import { fmtDuration, toTracks } from "@/components/content/songs/track";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("content.songs");
  try {
    const s = await getSong(id);
    return { title: s.title };
  } catch {
    return { title: t("title") };
  }
}

export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("content.read");
  const { id } = await params;
  const song = await pageQuery(getSong(id));
  const related = await relatedSongs(song, 6);
  const t = await getTranslations("content");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const canManage = can(user, "content.manage");
  const accent = songAccent(song.id);
  const queue = toTracks([song, ...related]);
  const tags = splitTags(song.tags);
  const rtl = song.language === "ar";

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("songs.title"), href: "/dashboard/content/songs" }, { label: song.title }]} />

      {/* Hero */}
      <section className="relative isolate overflow-hidden rounded-3xl p-4 shadow-[var(--shadow-soft)] sm:p-6" style={{ background: `linear-gradient(150deg, ${accent}33, ${accent}0A 60%, transparent)` }}>
        <div aria-hidden className="absolute -end-20 -top-24 -z-10 size-72 rounded-full opacity-30 blur-3xl" style={{ background: accent }} />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-7">
          <div className="relative mx-auto w-56 shrink-0 sm:mx-0 sm:w-60 lg:w-72">
            <SongCover seed={song.id} src={song.coverUrl} title={song.title} className="shadow-[0_24px_48px_-16px_rgb(34_27_51/0.45)]" rounded="rounded-3xl" />
            <NowPlayingMark trackId={song.id} className="absolute start-3 top-3" />
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-start">
            <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
              <Badge color={CATEGORY_COLORS[song.category]}>{tc(`enums.songCategory.${song.category}`)}</Badge>
              <Badge tone="warning">{tc(`enums.ageGroup.${song.ageGroup}`)}</Badge>
              {canManage && <Badge tone={song.isPublic ? "success" : "neutral"}>{song.isPublic ? t("common.publicBadge") : t("common.privateBadge")}</Badge>}
            </div>
            <h1 className={cn("mt-2 text-3xl leading-tight font-extrabold text-ink sm:text-4xl lg:text-5xl", rtl && "font-[family-name:var(--font-arabic)]")}>
              <bdi>{song.title}</bdi>
            </h1>
            {song.author && <p className="mt-1 text-base font-semibold text-ink-2">{song.author}</p>}
            <p className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted sm:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <Headphones className="size-4" /> <PlaysCount songId={song.id} initial={song.plays} />
              </span>
              {song.durationSec ? (
                <span className="inline-flex items-center gap-1.5 tabular-nums" dir="ltr">
                  <Clock className="size-4" /> {fmtDuration(song.durationSec)}
                </span>
              ) : null}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              {song.audioUrl ? (
                <PlayButton tracks={queue} trackId={song.id} title={song.title} size="xl" color={accent} className="shadow-[0_14px_30px_-10px_rgb(34_27_51/0.5)]" />
              ) : (
                <span className="rounded-full bg-surface-2 px-4 py-2 text-sm font-bold text-muted">{t("songs.noAudio")}</span>
              )}
              {canManage && (
                <div className="flex gap-2">
                  <LinkButton href={`/dashboard/content/songs/${song.id}/edit`} variant="outline" className="rounded-full">
                    <Edit className="size-4" /> {tc("actions.edit")}
                  </LinkButton>
                  <ConfirmButton action={deleteSong.bind(null, song.id)} variant="outline" size="md" className="rounded-full text-red-600" title={t("common.deleteTitle")} description={t("common.deleteText")} confirmLabel={tc("actions.delete")} redirectTo="/dashboard/content/songs" ariaLabel={tc("actions.delete")}>
                    <Trash2 className="size-4" />
                  </ConfirmButton>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <LyricsView lyrics={song.lyrics} language={song.language} songId={song.id} tracks={queue} accent={accent} />
        </div>
        <aside className="min-w-0 space-y-6">
          <section className="card p-5">
            <InfoList
              items={[
                { icon: <User className="size-4" />, label: t("songs.author"), value: song.author ?? "—" },
                { icon: <Music className="size-4" />, label: t("songs.category"), value: tc(`enums.songCategory.${song.category}`) },
                { icon: <Smile className="size-4" />, label: t("songs.ageGroup"), value: tc(`enums.ageGroup.${song.ageGroup}`) },
                { icon: <Globe2 className="size-4" />, label: t("songs.language"), value: (["ar", "fr", "en"] as const).includes(song.language as "ar") ? t(`songs.languages.${song.language as "ar"}`) : song.language },
                { icon: <Clock className="size-4" />, label: t("songs.duration"), value: <span dir="ltr">{fmtDuration(song.durationSec)}</span> },
              ]}
            />
            {tags.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 flex items-center gap-2 text-sm text-muted">
                  <Tag className="size-4" /> {t("songs.tags")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Link key={tag} href={`/dashboard/content/songs?q=${encodeURIComponent(tag)}`} className="inline-flex items-center gap-0.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold text-ink-2 hover:bg-brand-50 hover:text-brand-700">
                      <Hash className="size-3" />
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>

          {related.length > 0 && (
            <section className="card p-4">
              <h2 className="mb-2 px-1 text-lg font-extrabold text-ink">{t("songs.upNext")}</h2>
              <ul className="space-y-1">
                {related.map((s) => (
                  <li key={s.id} className="group flex items-center gap-3 rounded-2xl p-1.5 hover:bg-surface-2">
                    <SongCover seed={s.id} src={s.coverUrl} className="size-12 shrink-0" rounded="rounded-xl" />
                    <Link href={`/dashboard/content/songs/${s.id}`} className="min-w-0 flex-1">
                      <p className={cn("truncate font-bold text-ink group-hover:text-brand-700", s.language === "ar" && "font-[family-name:var(--font-arabic)]")}>
                        <bdi>{s.title}</bdi>
                      </p>
                      <p className="truncate text-xs text-muted">{s.author}</p>
                    </Link>
                    {s.audioUrl && <PlayButton tracks={queue} trackId={s.id} title={s.title} size="sm" color={songAccent(s.id)} />}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

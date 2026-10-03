import { useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { Clock, Headphones } from "lucide-react";
import { CATEGORY_COLORS } from "@onet/shared";
import { cn } from "@/lib/utils";
import type { songsPage } from "@api/modules/content/routes";
import type { Loaded } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { SongCover, songAccent } from "./song-cover";
import { NowPlayingMark, PlayButton } from "./play-button";
import { fmtDuration, type Track } from "./track";

/** Album-style card: cover with a floating play button, title, author and small badges. */
type SongListItem = Loaded<typeof songsPage>["rows"][number];

export function SongCard({ song, tracks }: { song: SongListItem; tracks: Track[] }) {
  const tc = useTranslations("common");
  const href = `/dashboard/content/songs/${song.id}`;
  const rtl = song.language === "ar";
  return (
    <article className="group relative animate-[var(--animate-fade-up)]">
      <div className="relative">
        <Link href={href} className="block rounded-2xl" tabIndex={-1} aria-hidden>
          <SongCover seed={song.id} src={song.coverUrl} className="shadow-[var(--shadow-soft)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-lift)]" />
        </Link>
        <NowPlayingMark trackId={song.id} className="absolute start-2.5 top-2.5" />
        {song.audioUrl && (
          <div className="absolute end-2.5 bottom-2.5 transition duration-300 sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100">
            <PlayButton tracks={tracks} trackId={song.id} title={song.title} color={songAccent(song.id)} className="ring-4 ring-white/70" />
          </div>
        )}
      </div>
      <Link href={href} className="mt-2.5 block rounded-lg px-0.5">
        <h3 className={cn("line-clamp-1 font-extrabold text-ink group-hover:text-brand-700", rtl && "font-[family-name:var(--font-arabic)]")}>
          <bdi>{song.title}</bdi>
        </h3>
        <p className="line-clamp-1 text-xs text-muted">{song.author ?? "ONET Teboulba"}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge color={CATEGORY_COLORS[song.category]}>{tc(`enums.songCategory.${song.category}`)}</Badge>
          {song.durationSec ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted tabular-nums" dir="ltr">
              <Clock className="size-3" /> {fmtDuration(song.durationSec)}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted tabular-nums">
            <Headphones className="size-3" /> {song.plays}
          </span>
        </div>
      </Link>
    </article>
  );
}

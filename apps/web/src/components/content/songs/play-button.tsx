import { useTranslations } from "use-intl";
import { Pause, Play, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayer } from "./player-context";
import { Equalizer } from "./mini-player";
import type { Track } from "./track";

/** Round play/pause button bound to a queue position. */
export function PlayButton({ tracks, trackId, size = "md", className, color, title }: { tracks: Track[]; trackId: string; size?: "sm" | "md" | "lg" | "xl"; className?: string; color?: string; title?: string }) {
  const t = useTranslations("content.songs");
  const { track, playing, playQueue } = usePlayer();
  const i = tracks.findIndex((x) => x.id === trackId);
  if (i < 0) return null;
  const active = track?.id === trackId && playing;
  const dims = { sm: "size-9 [&_svg]:size-4", md: "size-12 [&_svg]:size-5", lg: "size-14 [&_svg]:size-6", xl: "size-16 sm:size-20 [&_svg]:size-7 sm:[&_svg]:size-9" }[size];
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        playQueue(tracks, i);
      }}
      className={cn("grid shrink-0 place-items-center rounded-full text-white shadow-lg transition hover:scale-105 active:scale-95", dims, !color && "bg-brand-600", className)}
      style={color ? { background: color } : undefined}
      aria-label={active ? t("pause") : t("playSong", { title: title ?? tracks[i].title })}
      aria-pressed={active}
      data-testid="play-button"
    >
      {active ? <Pause fill="currentColor" /> : <Play className="translate-x-px" fill="currentColor" />}
    </button>
  );
}

/** "Play all" + "Shuffle" pill buttons for a list. */
export function PlayAllButtons({ tracks, onColor }: { tracks: Track[]; onColor?: boolean }) {
  const t = useTranslations("content.songs");
  const { playQueue } = usePlayer();
  if (!tracks.length) return null;
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => playQueue(tracks, 0)} className={cn("inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-extrabold transition active:scale-95", onColor ? "bg-white text-ink shadow-lg hover:bg-white/90" : "bg-brand-600 text-white shadow-[var(--shadow-brand)] hover:bg-brand-700")}>
        <Play className="size-4" fill="currentColor" /> {t("playAll")}
      </button>
      <button
        type="button"
        onClick={() => {
          const s = [...tracks];
          for (let i = s.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [s[i], s[j]] = [s[j], s[i]];
          }
          playQueue(s, 0);
        }}
        className={cn("inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-extrabold transition active:scale-95", onColor ? "bg-white/20 text-white ring-1 ring-white/40 hover:bg-white/30" : "border border-line bg-surface text-ink hover:bg-surface-2")}
      >
        <Shuffle className="size-4" /> <span className="hidden sm:inline">{t("shuffle")}</span>
      </button>
    </div>
  );
}

/** Small "now playing" equalizer shown on a card when its song is playing. */
export function NowPlayingMark({ trackId, className }: { trackId: string; className?: string }) {
  const { track, playing } = usePlayer();
  if (track?.id !== trackId || !playing) return null;
  return (
    <span className={cn("grid size-7 place-items-center rounded-full bg-white/95 shadow", className)}>
      <Equalizer color="#E30613" />
    </span>
  );
}

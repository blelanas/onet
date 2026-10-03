import { useTranslations } from "use-intl";
import { useRef, useState } from "react";
import { ChevronDown, Music, Star } from "lucide-react";
import { AudioPlayer } from "@/components/ui/audio-player";
import { CoverArt } from "@/components/ui/cover-art";
import { cn } from "@/lib/utils";
import { CategoryIcon, categoryColor } from "./category";

export type SongItem = {
  id: string;
  title: string;
  lyrics: string;
  audioUrl: string | null;
  coverUrl: string | null;
  category: string;
  ageGroup: string;
  author: string | null;
  language: string;
  durationSec: number | null;
  featured: boolean;
};

function fmt(s?: number | null) {
  if (!s) return "";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/** Music-app style song list + "now playing" panel with player and lyrics. */
export function SongBrowser({ songs, dark, lyricsOpen = true }: { songs: SongItem[]; dark?: boolean; lyricsOpen?: boolean }) {
  const t = useTranslations("public.songs");
  const tc = useTranslations("common");
  const [selectedId, setSelectedId] = useState(songs[0]?.id);
  const [showLyrics, setShowLyrics] = useState(lyricsOpen);
  const panelRef = useRef<HTMLDivElement>(null);
  const song = songs.find((s) => s.id === selectedId) ?? songs[0];
  if (!song) return null;
  const color = categoryColor(song.category);

  const select = (id: string) => {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 1023px)").matches) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
      {/* Now playing */}
      <div ref={panelRef} className="scroll-mt-24 lg:sticky lg:top-24" aria-live="polite">
        <div className={cn("overflow-hidden rounded-3xl", dark ? "bg-white/5 ring-1 ring-white/10" : "border border-line bg-surface shadow-[var(--shadow-lift)]")}>
          <CoverArt key={song.id} src={song.coverUrl} seed={song.id} color={color} icon={<CategoryIcon category={song.category} />} className="h-48 animate-[var(--animate-fade-up)] sm:h-56">
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-5 pt-12">
              <p className="text-xs font-extrabold tracking-[0.14em] text-white/80 uppercase">{t("nowPlaying")}</p>
              <h3 className="mt-1 text-2xl leading-tight font-extrabold text-white sm:text-3xl">
                {song.title}
              </h3>
              {song.author && <p className="mt-0.5 text-sm font-semibold text-white/80">{t("by", { author: song.author })}</p>}
            </div>
          </CoverArt>
          <div className="space-y-4 p-4 sm:p-5">
            {song.audioUrl ? (
              <AudioPlayer key={song.id} src={song.audioUrl} title={song.title} subtitle={tc(`enums.songCategory.${song.category}`)} color={color} />
            ) : (
              <p className={cn("rounded-2xl p-4 text-sm", dark ? "bg-white/5 text-white/70" : "bg-surface-2 text-muted")}>{t("noAudio")}</p>
            )}
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full px-2.5 py-1" style={{ background: `${color}22`, color: dark ? "#fff" : color }}>
                {tc(`enums.songCategory.${song.category}`)}
              </span>
              <span className={cn("rounded-full px-2.5 py-1", dark ? "bg-white/10 text-white/80" : "bg-surface-2 text-ink-2")}>{t("ageGroup", { age: tc(`enums.ageGroup.${song.ageGroup}`) })}</span>
              {t.has(`language.${song.language}`) && <span className={cn("rounded-full px-2.5 py-1", dark ? "bg-white/10 text-white/80" : "bg-surface-2 text-ink-2")}>{t(`language.${song.language}`)}</span>}
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShowLyrics((v) => !v)}
                aria-expanded={showLyrics}
                aria-controls="song-lyrics"
                className={cn("flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-extrabold transition", dark ? "bg-white/10 text-white hover:bg-white/15" : "bg-surface-2 text-ink hover:bg-brand-50")}
              >
                {showLyrics ? t("hideLyrics") : t("showLyrics")}
                <ChevronDown className={cn("size-4 transition-transform", showLyrics && "rotate-180")} />
              </button>
              {showLyrics && (
                <div id="song-lyrics" className={cn("mt-3 max-h-80 overflow-y-auto rounded-2xl p-5", dark ? "bg-black/20" : "bg-sun-soft/60")}>
                  <p className="sr-only">{t("lyrics")}</p>
                  <p lang={song.language} dir="auto" className={cn("font-display text-lg leading-loose whitespace-pre-line", dark ? "text-white/90" : "text-ink")}>
                    {song.lyrics}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Track list */}
      <div>
        <h3 className={cn("mb-3 text-sm font-extrabold tracking-[0.14em] uppercase", dark ? "text-white/60" : "text-muted")}>{t("tracklist")}</h3>
        <ol className="space-y-2">
          {songs.map((s, i) => {
            const active = s.id === song.id;
            const c = categoryColor(s.category);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => select(s.id)}
                  aria-pressed={active}
                  aria-label={t("select", { title: s.title })}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-2xl p-2.5 pe-4 text-start transition",
                    dark ? (active ? "bg-white/15 ring-1 ring-white/25" : "hover:bg-white/10") : active ? "bg-surface shadow-[var(--shadow-soft)] ring-2" : "bg-surface/60 ring-1 ring-line hover:bg-surface hover:shadow-[var(--shadow-soft)]",
                  )}
                  style={active && !dark ? ({ "--tw-ring-color": c } as React.CSSProperties) : undefined}
                >
                  <span className={cn("w-6 text-center text-sm font-extrabold tabular-nums", dark ? "text-white/50" : "text-muted")}>
                    {active ? <Equalizer color={dark ? "#FFB400" : c} /> : i + 1}
                  </span>
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${c}, ${c}B3)` }}>
                    <CategoryIcon category={s.category} className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("flex items-center gap-1.5 truncate font-extrabold", dark ? "text-white" : "text-ink")}>
                      {s.featured && <Star className="size-3.5 shrink-0 text-sun" fill="currentColor" aria-hidden />}
                      <span className="truncate">{s.title}</span>
                    </span>
                    <span className={cn("block truncate text-xs font-semibold", dark ? "text-white/60" : "text-muted")}>
                      {tc(`enums.songCategory.${s.category}`)}
                      {s.author ? ` · ${s.author}` : ""}
                    </span>
                  </span>
                  <span className={cn("text-xs font-bold tabular-nums", dark ? "text-white/50" : "text-muted")} dir="ltr">
                    {s.audioUrl ? fmt(s.durationSec) : <Music className="size-4 opacity-40" aria-hidden />}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function Equalizer({ color }: { color: string }) {
  return (
    <span className="inline-flex h-4 items-end gap-[2px]" aria-hidden>
      {[0, 0.2, 0.4].map((d) => (
        <span key={d} className="w-[3px] animate-pulse rounded-full" style={{ background: color, height: `${50 + d * 100}%`, animationDelay: `${d}s` }} />
      ))}
    </span>
  );
}

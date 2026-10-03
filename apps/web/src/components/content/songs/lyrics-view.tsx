import { useTranslations } from "use-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { AArrowDown, AArrowUp, Mic2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayer, usePlayerProgress } from "./player-context";
import { PlayButton } from "./play-button";
import type { Track } from "./track";

const SIZES = ["text-lg sm:text-xl", "text-xl sm:text-2xl", "text-2xl sm:text-3xl"];
const KARAOKE_SIZES = ["text-2xl sm:text-4xl", "text-3xl sm:text-5xl", "text-4xl sm:text-6xl"];

/**
 * Lyrics with large readable typography. Direction and font follow the song's language (Arabic → RTL).
 * Karaoke mode: giant high-contrast text; while the song plays, the current line is highlighted
 * (estimated from playback progress).
 */
export function LyricsView({ lyrics, language, songId, tracks, accent }: { lyrics: string; language: string; songId: string; tracks: Track[]; accent: string }) {
  const t = useTranslations("content.songs");
  const { track } = usePlayer();
  const { time, duration } = usePlayerProgress();
  const [karaoke, setKaraoke] = useState(false);
  const [size, setSize] = useState(1);
  const box = useRef<HTMLDivElement>(null);
  const rtl = language === "ar";

  const stanzas = useMemo(() => lyrics.split(/\n\s*\n/).map((s) => s.split("\n").map((l) => l.trim()).filter(Boolean)).filter((s) => s.length), [lyrics]);
  const totalLines = stanzas.reduce((n, s) => n + s.length, 0);
  const isCurrent = track?.id === songId && duration > 0;
  const current = isCurrent ? Math.min(totalLines - 1, Math.floor((time / duration) * totalLines)) : -1;

  useEffect(() => {
    if (!karaoke || current < 0) return;
    box.current?.querySelector(`[data-line="${current}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [current, karaoke]);

  useEffect(() => {
    if (!karaoke) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setKaraoke(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [karaoke]);

  let n = -1;
  const body = (
    <div ref={box} dir={rtl ? "rtl" : "ltr"} lang={language} className={cn("space-y-6", rtl && "font-[family-name:var(--font-arabic)]", karaoke && "py-[30vh] text-center")}>
      {stanzas.map((st, i) => (
        <p key={i} className={cn("space-y-1", karaoke ? "leading-[1.6]" : "leading-relaxed")}>
          {st.map((line) => {
            n++;
            const active = n === current;
            const past = current >= 0 && n < current;
            return (
              <span
                key={n}
                data-line={n}
                className={cn(
                  "block font-bold transition-all duration-500",
                  karaoke ? KARAOKE_SIZES[size] : SIZES[size],
                  karaoke ? (active ? "scale-105 text-sun" : past ? "text-white/45" : current >= 0 ? "text-white/80" : "text-white") : active ? "text-brand-600" : "text-ink",
                )}
              >
                {line}
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );

  const controls = (dark: boolean) => (
    <div className="flex items-center gap-1">
      <span className="sr-only">{t("textSize")}</span>
      <button type="button" onClick={() => setSize((s) => Math.max(0, s - 1))} disabled={size === 0} className={cn("grid size-9 place-items-center rounded-xl disabled:opacity-30", dark ? "text-white hover:bg-white/10" : "text-ink-2 hover:bg-surface-2")} aria-label={`${t("textSize")} −`}>
        <AArrowDown className="size-5" />
      </button>
      <button type="button" onClick={() => setSize((s) => Math.min(2, s + 1))} disabled={size === 2} className={cn("grid size-9 place-items-center rounded-xl disabled:opacity-30", dark ? "text-white hover:bg-white/10" : "text-ink-2 hover:bg-surface-2")} aria-label={`${t("textSize")} +`}>
        <AArrowUp className="size-5" />
      </button>
    </div>
  );

  if (karaoke) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-[#120d1f] text-white" role="dialog" aria-modal="true" aria-label={t("karaoke")}>
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <p className="flex items-center gap-2 font-extrabold">
            <Mic2 className="size-5 text-sun" /> {t("karaoke")}
          </p>
          <div className="flex items-center gap-2">
            <PlayButton tracks={tracks} trackId={songId} size="sm" color={accent} />
            {controls(true)}
            <button type="button" onClick={() => setKaraoke(false)} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-extrabold text-ink" aria-label={t("exitKaraoke")}>
              <X className="size-4" /> <span className="hidden sm:inline">{t("exitKaraoke")}</span>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-32">{body}</div>
        {isCurrent && (
          <div className="h-1.5 bg-white/10" dir="ltr">
            <div className="h-full transition-[width] duration-300" style={{ width: `${(time / duration) * 100}%`, background: accent }} />
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h2 className="text-lg font-extrabold text-ink">{t("lyrics")}</h2>
        <div className="flex items-center gap-2">
          {controls(false)}
          <button type="button" onClick={() => setKaraoke(true)} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-extrabold text-white transition hover:bg-ink-2" title={t("karaokeHint")} data-testid="karaoke-toggle">
            <Mic2 className="size-4 text-sun" /> {t("karaoke")}
          </button>
        </div>
      </div>
      <div className="px-5 py-6 sm:px-8 sm:py-8">{body}</div>
    </section>
  );
}

/** Live plays counter (server value + plays started in this session). */
export function PlaysCount({ songId, initial }: { songId: string; initial: number }) {
  const t = useTranslations("content.songs");
  const { bumps } = usePlayer();
  // Plays recorded before this page was rendered are already in `initial`.
  const [baseline] = useState(() => bumps[songId] ?? 0);
  const count = initial + (bumps[songId] ?? 0) - baseline;
  return <span data-testid="plays-count" data-count={count}>{t("plays", { count })}</span>;
}

"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayer, usePlayerProgress } from "./player-context";
import { SongCover, songAccent } from "./song-cover";
import { fmtDuration } from "./track";

/** Floating player docked above the mobile tab bar (and at the bottom of the content area on desktop). */
export function MiniPlayer() {
  const t = useTranslations("content.songs");
  const { track, playing, toggle, next, prev, close, queue, index, seek } = usePlayer();
  const { time, duration } = usePlayerProgress();
  if (!track) return null;
  const accent = songAccent(track.id);
  const pct = duration ? Math.min(100, (time / duration) * 100) : 0;
  const isAr = track.language === "ar";

  return (
    <div
      role="region"
      aria-label={t("player.label")}
      className="fixed inset-x-2 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 animate-[var(--animate-fade-up)] sm:inset-x-4 lg:start-[calc(272px+2rem)] lg:end-8 lg:bottom-5"
    >
      <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl bg-ink/95 text-white shadow-[0_18px_40px_-12px_rgb(34_27_51/0.55)] ring-1 ring-white/10 backdrop-blur-md">
        {/* glow */}
        <div aria-hidden className="pointer-events-none absolute -start-10 -top-16 size-40 rounded-full opacity-40 blur-3xl" style={{ background: accent }} />
        <div className="relative flex items-center gap-3 p-2 pe-3 sm:p-2.5 sm:pe-4">
          <Link href={`/dashboard/content/songs/${track.id}`} className="shrink-0" aria-label={t("player.open")}>
            <SongCover seed={track.id} src={track.coverUrl} className={cn("size-12 shadow-lg sm:size-14", playing && "animate-[spin_12s_linear_infinite] rounded-full")} rounded="rounded-xl" />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/dashboard/content/songs/${track.id}`} className={cn("block truncate text-sm font-extrabold hover:underline sm:text-base", isAr && "font-[family-name:var(--font-arabic)]")}>
              <bdi>{track.title}</bdi>
            </Link>
            <p className="flex items-center gap-2 truncate text-xs text-white/60">
              {playing && <Equalizer color={accent} />}
              <span className="truncate">{track.author ?? t("nowPlaying")}</span>
            </p>
            <div className="mt-1.5 hidden items-center gap-2 sm:flex" dir="ltr">
              <span className="w-8 text-[11px] text-white/60 tabular-nums">{fmtDuration(time)}</span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={Math.min(time, duration || 0)}
                onChange={(e) => seek(Number(e.target.value))}
                className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/20"
                style={{ accentColor: accent }}
                aria-label={t("duration")}
              />
              <span className="w-8 text-[11px] text-white/60 tabular-nums">{fmtDuration(duration)}</span>
            </div>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1" dir="ltr">
            <button type="button" onClick={prev} className="grid size-9 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white" aria-label={t("player.previous")}>
              <SkipBack className="size-[18px]" fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={toggle}
              className="grid size-11 place-items-center rounded-full bg-white text-ink shadow-md transition hover:scale-105 active:scale-95"
              aria-label={playing ? t("pause") : t("play")}
              data-testid="mini-toggle"
            >
              {playing ? <Pause className="size-5" fill="currentColor" /> : <Play className="size-5 translate-x-px" fill="currentColor" />}
            </button>
            <button type="button" onClick={next} disabled={index >= queue.length - 1} className="grid size-9 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-30" aria-label={t("player.next")}>
              <SkipForward className="size-[18px]" fill="currentColor" />
            </button>
          </div>
          <button type="button" onClick={close} className="hidden size-8 place-items-center rounded-full text-white/50 hover:bg-white/10 hover:text-white sm:grid" aria-label={t("player.close")}>
            <X className="size-4" />
          </button>
        </div>
        {/* thin progress (mobile) */}
        <div className="h-1 bg-white/10 sm:hidden" dir="ltr">
          <div className="h-full rounded-e-full transition-[width] duration-300" style={{ width: `${pct}%`, background: accent }} />
        </div>
      </div>
    </div>
  );
}

export function Equalizer({ color = "currentColor", className }: { color?: string; className?: string }) {
  return (
    <span className={cn("inline-flex h-3 items-end gap-[2px]", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-[3px] rounded-full" style={{ background: color, height: "100%", animation: `onet-eq 0.9s ${i * 0.18}s ease-in-out infinite alternate`, transformOrigin: "bottom" }} />
      ))}
      <style>{`@keyframes onet-eq{0%{transform:scaleY(.25)}100%{transform:scaleY(1)}}`}</style>
    </span>
  );
}

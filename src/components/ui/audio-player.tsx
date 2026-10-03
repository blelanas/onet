"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(s: number) {
  if (!Number.isFinite(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/** Music-style audio player. `onPlay` lets the parent count plays. */
export function AudioPlayer({ src, title, subtitle, color = "#E30613", onFirstPlay, className }: { src: string; title?: string; subtitle?: string; color?: string; onFirstPlay?: () => void; className?: string }) {
  const t = useTranslations("common");
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState(false);
  const played = useRef(false);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const onTime = () => setTime(a.currentTime);
    const onMeta = () => setDur(a.duration);
    const onEnd = () => setPlaying(false);
    const onErr = () => setError(true);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    a.addEventListener("error", onErr);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("error", onErr);
    };
  }, []);

  const toggle = async () => {
    const a = ref.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      try {
        await a.play();
        setPlaying(true);
        if (!played.current) {
          played.current = true;
          onFirstPlay?.();
        }
      } catch {
        setError(true);
      }
    }
  };

  return (
    <div className={cn("rounded-2xl bg-ink p-4 text-white shadow-[var(--shadow-lift)]", className)}>
      <audio ref={ref} src={src} preload="metadata" muted={muted} />
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          disabled={error}
          className="grid size-14 shrink-0 place-items-center rounded-full text-white shadow-lg transition hover:scale-105 active:scale-95 disabled:opacity-50"
          style={{ background: color }}
          aria-label={playing ? t("audio.pause") : t("audio.play")}
        >
          {playing ? <Pause className="size-6" fill="currentColor" /> : <Play className="size-6 translate-x-0.5" fill="currentColor" />}
        </button>
        <div className="min-w-0 flex-1">
          {title && <p className="truncate font-bold">{title}</p>}
          {subtitle && <p className="truncate text-xs text-white/60">{subtitle}</p>}
          {error ? (
            <p className="mt-2 text-xs text-white/70">{t("audio.unavailable")}</p>
          ) : (
            <div className="mt-2 flex items-center gap-3" dir="ltr">
              <span className="w-9 text-xs text-white/60 tabular-nums">{fmt(time)}</span>
              <input
                type="range"
                min={0}
                max={dur || 0}
                step={0.1}
                value={time}
                onChange={(e) => {
                  const a = ref.current;
                  if (a) a.currentTime = Number(e.target.value);
                }}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/20"
                style={{ accentColor: color }}
                aria-label={t("audio.seek")}
              />
              <span className="w-9 text-xs text-white/60 tabular-nums">{fmt(dur)}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <button type="button" onClick={() => setMuted((m) => !m)} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label={t("audio.mute")}>
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              const a = ref.current;
              if (a) a.currentTime = 0;
            }}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label={t("audio.restart")}
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

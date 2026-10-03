"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Maximize2, Minimize2, Minus, Pause, Play, Plus, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "idle" | "running" | "paused" | "done";

function fmt(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function beep(ctx: AudioContext, at: number, freq: number) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.value = freq;
  o.type = "triangle";
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.4, at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
  o.connect(g).connect(ctx.destination);
  o.start(at);
  o.stop(at + 0.4);
}

/**
 * Big-screen "animation mode" for monitors: a countdown for the game duration (progress ring,
 * ±1 min, end chime, Space to start/pause, full screen) next to the rules in large type.
 */
export function AnimationStage({ minutes, color, title, children }: { minutes: number; color: string; title: string; children: React.ReactNode }) {
  const t = useTranslations("content.games.timer");
  const stage = useRef<HTMLDivElement>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const [total, setTotal] = useState(minutes * 60_000);
  const [left, setLeft] = useState(minutes * 60_000);
  const [status, setStatus] = useState<Status>("idle");
  const [sound, setSound] = useState(true);
  const [full, setFull] = useState(false);
  const endAt = useRef(0);

  const chime = useCallback(() => {
    if (!sound) return;
    try {
      const ctx = audioCtx.current ?? new AudioContext();
      audioCtx.current = ctx;
      const now = ctx.currentTime;
      [0, 0.45, 0.9].forEach((d, i) => beep(ctx, now + d, i === 2 ? 1046 : 784));
    } catch {
      /* audio not available */
    }
  }, [sound]);

  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => {
      const rest = endAt.current - Date.now();
      if (rest <= 0) {
        setLeft(0);
        setStatus("done");
        chime();
      } else setLeft(rest);
    }, 200);
    return () => clearInterval(id);
  }, [status, chime]);

  const start = useCallback(() => {
    // Create the AudioContext inside a user gesture so the end chime can play later.
    if (sound && !audioCtx.current) {
      try {
        audioCtx.current = new AudioContext();
      } catch {
        /* ignore */
      }
    }
    const from = status === "done" ? total : left;
    endAt.current = Date.now() + from;
    setLeft(from);
    setStatus("running");
  }, [left, total, status, sound]);

  const pause = () => {
    setLeft(Math.max(0, endAt.current - Date.now()));
    setStatus("paused");
  };
  const reset = () => {
    setStatus("idle");
    setLeft(total);
  };
  const adjust = (deltaMin: number) => {
    const d = deltaMin * 60_000;
    const nextTotal = Math.max(60_000, total + d);
    setTotal(nextTotal);
    if (status === "running") endAt.current = Math.max(Date.now() + 1000, endAt.current + d);
    setLeft((l) => (status === "idle" ? nextTotal : Math.max(1000, l + d)));
    if (status === "done") setStatus("paused");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || (e.target as HTMLElement)?.closest("button, input, textarea, select, a")) return;
      e.preventDefault();
      if (status === "running") pause();
      else start();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    const onFs = () => setFull(document.fullscreenElement === stage.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stage.current?.requestFullscreen?.();
  };

  const ratio = total ? left / total : 0;
  const R = 120;
  const C = 2 * Math.PI * R;
  const low = status !== "idle" && ratio <= 0.1;
  const ringColor = status === "done" ? "#E30613" : low ? "#FF6B4A" : color;
  const label = { idle: t("ready"), running: t("running"), paused: t("paused"), done: t("done") }[status];

  const ctrl = "grid size-12 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-30";

  return (
    <div ref={stage} className={cn("relative overflow-hidden rounded-3xl bg-[#140f22] text-white shadow-[var(--shadow-lift)]", full && "rounded-none")} data-testid="animation-stage">
      <div aria-hidden className="pointer-events-none absolute -start-24 -top-24 size-96 rounded-full opacity-30 blur-3xl" style={{ background: color }} />
      <div aria-hidden className="pointer-events-none absolute -end-24 -bottom-24 size-96 rounded-full bg-[#7C4DFF] opacity-20 blur-3xl" />
      <div className={cn("relative grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center", full && "min-h-dvh content-center")}>
        {/* Timer */}
        <div className="flex flex-col items-center">
          <p className="mb-2 text-center text-lg font-extrabold text-white/80 sm:text-xl">{title}</p>
          <div className={cn("relative aspect-square w-full max-w-[19rem] sm:max-w-[24rem]", status === "done" && "animate-pulse")} role="timer" aria-label={t("label")} aria-live="off">
            <svg viewBox="0 0 280 280" className="size-full -rotate-90">
              <circle cx="140" cy="140" r={R} stroke="rgb(255 255 255 / 0.1)" strokeWidth="18" fill="none" />
              <circle cx="140" cy="140" r={R} stroke={ringColor} strokeWidth="18" fill="none" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - ratio)} style={{ transition: "stroke-dashoffset .25s linear, stroke .3s" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center" dir="ltr">
              <span className="text-6xl font-extrabold tracking-tight tabular-nums sm:text-7xl" data-testid="timer-display">
                {fmt(left)}
              </span>
              <span className="mt-1 text-sm font-extrabold tracking-wide uppercase" style={{ color: ringColor }}>
                {label}
              </span>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2" dir="ltr">
            <button type="button" onClick={() => adjust(-1)} className={ctrl} aria-label={t("minusMinute")} disabled={total <= 60_000}>
              <Minus className="size-5" />
            </button>
            <button type="button" onClick={reset} className={ctrl} aria-label={t("reset")}>
              <RotateCcw className="size-5" />
            </button>
            {status === "running" ? (
              <button type="button" onClick={pause} className="inline-flex h-16 items-center gap-2 rounded-full bg-white px-7 text-lg font-extrabold text-ink shadow-xl transition active:scale-95" data-testid="timer-toggle">
                <Pause className="size-6" fill="currentColor" /> {t("pause")}
              </button>
            ) : (
              <button type="button" onClick={start} className="inline-flex h-16 items-center gap-2 rounded-full px-7 text-lg font-extrabold text-white shadow-xl transition active:scale-95" style={{ background: color }} data-testid="timer-toggle">
                <Play className="size-6" fill="currentColor" /> {status === "paused" ? t("resume") : t("start")}
              </button>
            )}
            <button type="button" onClick={() => adjust(1)} className={ctrl} aria-label={t("plusMinute")}>
              <Plus className="size-5" />
            </button>
            <button type="button" onClick={() => setSound((s) => !s)} className={ctrl} aria-label={t("sound")} aria-pressed={sound}>
              {sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
            </button>
          </div>
          <button type="button" onClick={toggleFull} className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white/70 hover:bg-white/10 hover:text-white">
            {full ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />} {full ? t("exitFullscreen") : t("fullscreen")}
          </button>
        </div>
        {/* Rules */}
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

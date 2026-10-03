"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { recordSongPlay } from "@/server/content/song-actions";
import type { Track } from "./track";
import { MiniPlayer } from "./mini-player";

type PlayerState = {
  queue: Track[];
  index: number;
  track: Track | null;
  playing: boolean;
  /** Plays recorded in this session, per song id (keeps counters live without a reload). */
  bumps: Record<string, number>;
  playQueue: (tracks: Track[], index: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (t: number) => void;
  close: () => void;
};
type Progress = { time: number; duration: number };

const PlayerCtx = createContext<PlayerState | null>(null);
const ProgressCtx = createContext<Progress>({ time: 0, duration: 0 });

export function usePlayer() {
  const ctx = useContext(PlayerCtx);
  if (!ctx) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return ctx;
}
export const usePlayerProgress = () => useContext(ProgressCtx);

/**
 * One <audio> element for the whole content section: it lives in the content layout so music keeps
 * playing while navigating between the songs list and song pages. Renders the floating mini-player.
 */
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("content.songs.player");
  const audio = useRef<HTMLAudioElement>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState<Progress>({ time: 0, duration: 0 });
  const [bumps, setBumps] = useState<Record<string, number>>({});
  // A play is counted once per "play start": a fresh load of a track, or a replay after it ended.
  const counted = useRef<string | null>(null);
  const track = queue[index] ?? null;
  const trackRef = useRef<Track | null>(null);
  trackRef.current = track;

  const load = useCallback((tr: Track) => {
    const a = audio.current;
    if (!a) return;
    counted.current = null;
    a.src = tr.src;
    setProgress({ time: 0, duration: tr.durationSec ?? 0 });
    // Called synchronously inside the click handler so mobile browsers allow playback.
    a.play().catch((e: unknown) => {
      if (e instanceof DOMException && e.name === "AbortError") return;
      toast.error(t("error"));
    });
  }, [t]);

  const playQueue = useCallback(
    (tracks: Track[], i: number) => {
      const target = tracks[i];
      if (!target) return;
      const a = audio.current;
      if (trackRef.current?.id === target.id && a) {
        // Same song: just toggle, but adopt the new list for next/previous.
        setQueue(tracks);
        setIndex(i);
        if (a.paused) void a.play();
        else a.pause();
        return;
      }
      setQueue(tracks);
      setIndex(i);
      load(target);
    },
    [load],
  );

  const go = useCallback(
    (delta: number) => {
      const i = index + delta;
      if (i < 0 || i >= queue.length) {
        if (delta < 0 && audio.current) audio.current.currentTime = 0;
        return;
      }
      setIndex(i);
      load(queue[i]);
    },
    [index, queue, load],
  );

  const toggle = useCallback(() => {
    const a = audio.current;
    if (!a || !trackRef.current) return;
    if (a.paused) void a.play();
    else a.pause();
  }, []);

  const prev = useCallback(() => {
    const a = audio.current;
    // Like music apps: "previous" restarts the song unless we're at its very beginning.
    if (a && a.currentTime > 3) a.currentTime = 0;
    else go(-1);
  }, [go]);

  const value = useMemo<PlayerState>(
    () => ({
      queue,
      index,
      track,
      playing,
      bumps,
      playQueue,
      toggle,
      next: () => go(1),
      prev,
      seek: (s: number) => {
        if (audio.current) audio.current.currentTime = s;
      },
      close: () => {
        audio.current?.pause();
        setQueue([]);
        setIndex(0);
      },
    }),
    [queue, index, track, playing, bumps, playQueue, toggle, go, prev],
  );

  // Audio element events.
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const onPlay = () => {
      setPlaying(true);
      const tr = trackRef.current;
      if (tr && counted.current !== tr.id) {
        counted.current = tr.id;
        setBumps((b) => ({ ...b, [tr.id]: (b[tr.id] ?? 0) + 1 }));
        void recordSongPlay(tr.id);
      }
    };
    const onPause = () => setPlaying(false);
    const onTime = () => setProgress({ time: a.currentTime, duration: Number.isFinite(a.duration) ? a.duration : (trackRef.current?.durationSec ?? 0) });
    const onEnded = () => {
      setPlaying(false);
      counted.current = null;
      document.dispatchEvent(new CustomEvent("onet:track-ended"));
    };
    const onError = () => {
      if (a.getAttribute("src")) {
        setPlaying(false);
        toast.error(t("error"));
      }
    };
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onTime);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onTime);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
    };
  }, [t]);

  // Auto-advance through the queue.
  useEffect(() => {
    const onEnded = () => {
      if (index < queue.length - 1) go(1);
    };
    document.addEventListener("onet:track-ended", onEnded);
    return () => document.removeEventListener("onet:track-ended", onEnded);
  }, [index, queue.length, go]);

  // Lock-screen / headset controls.
  useEffect(() => {
    if (!track || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.author ?? "ONET Teboulba", artwork: track.coverUrl ? [{ src: track.coverUrl }] : [] });
    navigator.mediaSession.setActionHandler("play", toggle);
    navigator.mediaSession.setActionHandler("pause", toggle);
    navigator.mediaSession.setActionHandler("nexttrack", () => go(1));
    navigator.mediaSession.setActionHandler("previoustrack", prev);
  }, [track, toggle, go, prev]);

  return (
    <PlayerCtx.Provider value={value}>
      <ProgressCtx.Provider value={progress}>
        {children}
        <audio ref={audio} preload="metadata" data-testid="content-audio" className="hidden" />
        {track && <div aria-hidden className="h-24" />}
        <MiniPlayer />
      </ProgressCtx.Provider>
    </PlayerCtx.Provider>
  );
}

export type Track = {
  id: string;
  title: string;
  author: string | null;
  src: string;
  coverUrl: string | null;
  language: string;
  durationSec: number | null;
};

/** Song row → serialisable player track (only songs with audio are playable). */
export function toTrack(s: { id: string; title: string; author: string | null; audioUrl: string | null; coverUrl: string | null; language: string; durationSec: number | null }): Track | null {
  if (!s.audioUrl) return null;
  return { id: s.id, title: s.title, author: s.author, src: s.audioUrl, coverUrl: s.coverUrl, language: s.language, durationSec: s.durationSec };
}

export function toTracks(songs: Parameters<typeof toTrack>[0][]): Track[] {
  return songs.map(toTrack).filter((t): t is Track => !!t);
}

export function fmtDuration(s?: number | null) {
  if (s == null || !Number.isFinite(s)) return "0:00";
  const v = Math.max(0, Math.floor(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
}

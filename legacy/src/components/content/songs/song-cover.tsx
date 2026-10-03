/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

const PAIRS: [string, string][] = [
  ["#E30613", "#FFB400"],
  ["#7C4DFF", "#E8457C"],
  ["#1E9BD7", "#2BB673"],
  ["#FF6B4A", "#FFB400"],
  ["#00A3A3", "#1E9BD7"],
  ["#E8457C", "#7C4DFF"],
  ["#2BB673", "#FFB400"],
  ["#1E9BD7", "#7C4DFF"],
  ["#FF6B4A", "#E8457C"],
  ["#00A3A3", "#2BB673"],
];

function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  return h;
}

/** Deterministic accent color for a song (used by the player, progress bars, buttons). */
export function songAccent(seed: string) {
  return PAIRS[hash(seed) % PAIRS.length][0];
}

/**
 * Album-style cover. Uses the uploaded image when present, otherwise a unique generated artwork
 * (two-color gradient + vinyl rings + floating notes) derived from the song id.
 */
export function SongCover({ seed, src, title, className, rounded = "rounded-2xl", showTitle = false }: { seed: string; src?: string | null; title?: string; className?: string; rounded?: string; showTitle?: boolean }) {
  const h = hash(seed);
  const [a, b] = PAIRS[h % PAIRS.length];
  const angle = 100 + (h % 140);
  const r = (n: number) => ((h >>> n) % 100) / 100;
  const shape = h % 3;
  return (
    <div className={cn("relative isolate aspect-square overflow-hidden", rounded, className)} style={{ background: `linear-gradient(${angle}deg, ${a}, ${b})` }}>
      {src ? (
        <img src={src} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
      ) : (
        <svg className="absolute inset-0 size-full" viewBox="0 0 200 200" aria-hidden preserveAspectRatio="xMidYMid slice">
          {shape === 0 && (
            <g opacity=".22" fill="none" stroke="#fff">
              <circle cx={150 - r(3) * 30} cy={150 - r(5) * 30} r="70" strokeWidth="2" />
              <circle cx={150 - r(3) * 30} cy={150 - r(5) * 30} r="52" strokeWidth="2" />
              <circle cx={150 - r(3) * 30} cy={150 - r(5) * 30} r="34" strokeWidth="2" />
              <circle cx={150 - r(3) * 30} cy={150 - r(5) * 30} r="12" fill="#fff" />
            </g>
          )}
          {shape === 1 && (
            <g opacity=".25" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round">
              <path d={`M-10 ${120 + r(2) * 20} q 30 -40 60 0 t 60 0 t 60 0 t 60 0`} />
              <path d={`M-10 ${150 + r(4) * 20} q 30 -40 60 0 t 60 0 t 60 0 t 60 0`} opacity=".6" />
            </g>
          )}
          {shape === 2 && (
            <g fill="#fff" opacity=".16">
              <rect x={110 + r(6) * 30} y={20} width="16" height="180" rx="8" />
              <rect x={136 + r(6) * 30} y={60} width="16" height="140" rx="8" />
              <rect x={162 + r(6) * 30} y={100} width="16" height="100" rx="8" />
              <rect x={84 + r(6) * 30} y={90} width="16" height="110" rx="8" />
            </g>
          )}
          <circle cx={30 + r(7) * 40} cy={30 + r(9) * 30} r={38 + r(11) * 20} fill="#fff" opacity=".12" />
          <circle cx={60 + r(13) * 80} cy={40 + r(15) * 40} r="4" fill="#fff" opacity=".9" />
          <circle cx={150 + r(17) * 30} cy={30 + r(19) * 30} r="6" fill="#FFF4D6" opacity=".9" />
          {/* music notes */}
          <g fill="#fff" opacity=".92" transform={`translate(${38 + r(21) * 40} ${92 + r(23) * 30}) rotate(${-14 + r(25) * 20})`}>
            <ellipse cx="0" cy="34" rx="11" ry="8" />
            <rect x="8" y="-6" width="4" height="40" rx="2" />
            <ellipse cx="36" cy="26" rx="11" ry="8" />
            <rect x="44" y="-14" width="4" height="40" rx="2" />
            <path d="M8 -6 L48 -14 L48 -4 L8 4 Z" />
          </g>
        </svg>
      )}
      {showTitle && title && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent p-3 pt-10">
          <p className="line-clamp-2 text-sm leading-tight font-extrabold text-white drop-shadow">{title}</p>
        </div>
      )}
    </div>
  );
}

/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

/**
 * Cover image for activities/events/trips/songs… If no image is uploaded we render a generated,
 * on-brand artwork (gradient + confetti shapes + emoji/icon) so cards never look empty.
 */
export function CoverArt({
  src,
  seed,
  color = "#E30613",
  icon,
  className,
  alt = "",
  children,
}: {
  src?: string | null;
  seed: string;
  color?: string;
  icon?: React.ReactNode;
  className?: string;
  alt?: string;
  children?: React.ReactNode;
}) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) >>> 0;
  const r = (n: number) => ((h >>> n) % 100) / 100;
  return (
    <div className={cn("relative isolate overflow-hidden", className)} style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}D9 55%, ${color}99 100%)` }}>
      {src ? (
        <img src={src} alt={alt} className="absolute inset-0 size-full object-cover" loading="lazy" />
      ) : (
        <>
          <svg className="absolute inset-0 size-full" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden>
            <circle cx={320 + r(1) * 60} cy={30 + r(3) * 40} r={70 + r(5) * 30} fill="#fff" opacity=".12" />
            <circle cx={40 + r(7) * 60} cy={200 + r(9) * 30} r={60 + r(11) * 30} fill="#fff" opacity=".1" />
            <circle cx={120 + r(13) * 160} cy={40 + r(15) * 30} r="7" fill="#FFB400" opacity=".9" />
            <circle cx={260 + r(17) * 100} cy={170 + r(19) * 50} r="5" fill="#fff" opacity=".8" />
            <rect x={60 + r(21) * 80} y={110 + r(23) * 40} width="12" height="12" rx="3" transform={`rotate(${r(25) * 90} 70 120)`} fill="#fff" opacity=".55" />
            <path d={`M${300 - r(2) * 60} ${120 + r(4) * 30} q 18 -22 36 0 t 36 0`} stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".5" />
          </svg>
          {icon && <div className="absolute inset-0 grid place-items-center text-white/95 drop-shadow-[0_6px_14px_rgb(0_0_0/0.18)] [&_svg]:size-14">{icon}</div>}
        </>
      )}
      {children}
    </div>
  );
}

/** Decorative SVG shapes used across the public site (all aria-hidden, colour via currentColor). */
type P = { className?: string; style?: React.CSSProperties };

export function Wave({ className, flip }: P & { flip?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden style={flip ? { transform: "scaleY(-1)" } : undefined}>
      <path fill="currentColor" d="M0 48c120-26 240-40 360-30s240 44 360 46 240-30 360-40 240 4 360 18v38H0z" />
    </svg>
  );
}

export function Squiggle({ className, style }: P) {
  return (
    <svg className={className} style={style} viewBox="0 0 120 24" fill="none" aria-hidden>
      <path d="M4 14c10-12 20-12 28 0s18 12 28 0 18-12 28 0 18 12 28 0" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export function Star({ className, style }: P) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M12 1.8l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9l7.1-.6z" />
    </svg>
  );
}

export function Burst({ className, style }: P) {
  return (
    <svg className={className} style={style} viewBox="0 0 100 100" aria-hidden>
      <path
        fill="currentColor"
        d="M50 0l8 20 18-12-2 22 22-2-12 18 20 8-20 8 12 18-22-2 2 22-18-12-8 20-8-20-18 12 2-22-22 2 12-18L0 50l20-8L8 24l22 2-2-22 18 12z"
      />
    </svg>
  );
}

/** Hand-drawn underline for highlighted words. */
export function Underline({ className, style }: P) {
  return (
    <svg className={className} style={style} viewBox="0 0 300 20" preserveAspectRatio="none" fill="none" aria-hidden>
      <path d="M4 14C70 4 150 2 296 10" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

export function FacebookIcon({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.7V4.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.4H7.7V14h2.7v8h3.1z" />
    </svg>
  );
}

export function InstagramIcon({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

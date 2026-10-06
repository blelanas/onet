/** Circular progress ring with a centered label (server-safe SVG). */
export function Ring({ value, size = 96, stroke = 10, color = "#1E9460", track = "#f0e6df", children, label }: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: React.ReactNode; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="group" aria-label={label ?? `${pct}%`}>
      <svg aria-hidden="true" width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function rateColor(rate: number | null) {
  if (rate == null) return "#7a7390";
  return rate >= 80 ? "#1E9460" : rate >= 60 ? "#D98B00" : "#E30613";
}

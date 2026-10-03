import { cn } from "@/lib/utils";

export const TONES = {
  neutral: "bg-surface-2 text-ink-2 ring-line",
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  success: "bg-leaf-soft text-emerald-700 ring-emerald-200/60",
  warning: "bg-sun-soft text-amber-700 ring-amber-200/70",
  danger: "bg-red-50 text-red-700 ring-red-200/70",
  info: "bg-sky-soft text-sky-700 ring-sky-200/70",
  violet: "bg-grape-soft text-violet-700 ring-violet-200/70",
  teal: "bg-teal-soft text-teal-700 ring-teal-200/70",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({
  tone = "neutral",
  dot,
  className,
  children,
  color,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
  /** Custom hex color (overrides tone) — used for categories/groups. */
  color?: string;
}) {
  const style = color ? { backgroundColor: `${color}1A`, color, boxShadow: `inset 0 0 0 1px ${color}33` } : undefined;
  return (
    <span
      style={style}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap",
        !color && "ring-1 ring-inset",
        !color && TONES[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

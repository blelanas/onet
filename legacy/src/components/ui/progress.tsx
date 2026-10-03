import { cn } from "@/lib/utils";

export function Progress({ value, max = 100, color, className, label }: { value: number; max?: number; color?: string; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-2", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: color ?? "var(--brand-600)" }} />
    </div>
  );
}

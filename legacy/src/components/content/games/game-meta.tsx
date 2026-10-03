import { Baby, Brain, Clock, Flag, Home, Lightbulb, Smile, Snowflake, Sparkles, Trees, Users, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const GAME_ICONS: Record<string, LucideIcon> = {
  OUTDOOR: Trees,
  INDOOR: Home,
  TEAM: Flag,
  EDUCATIONAL: Lightbulb,
  ICEBREAKER: Snowflake,
  ENERGIZER: Zap,
};

export const AGE_ICONS: Record<string, LucideIcon> = { "4-7": Baby, "8-12": Smile, "13-17": Brain, ALL: Sparkles };

export function GameIcon({ category, className }: { category: string; className?: string }) {
  const Icon = GAME_ICONS[category] ?? Sparkles;
  return <Icon className={className} />;
}

/** Compact icon + value chip (players, duration, age). */
export function MetaChip({ icon: Icon, children, className, color }: { icon: LucideIcon; children: React.ReactNode; className?: string; color?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold text-ink-2", className)} style={color ? { backgroundColor: `${color}14`, color } : undefined}>
      <Icon className="size-3.5 shrink-0" />
      {children}
    </span>
  );
}

export function playersLabel(t: (k: string, v?: Record<string, number>) => string, min: number, max: number | null) {
  return max ? (max === min ? String(min) : t("common.players", { min, max })) : t("common.playersMin", { min });
}

export { Clock, Users };

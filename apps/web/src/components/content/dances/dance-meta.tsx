import { Baby, Drum, Music2, Sparkles, Users, type LucideIcon } from "lucide-react";

/**
 * Accent colour per dance category: deep variants of the ONET accents (sky, coral, grape, sun, pink).
 * They colour chip/badge text and carry white step numbers, so each stays ≥ 4.5:1 against white
 * (5.5–6.2:1) and against its own 10 % tint (≥ 4.8:1).
 */
export const DANCE_COLORS: Record<string, string> = {
  GROUP: "#0A6EA3",
  TRADITIONAL: "#B83C0C",
  MODERN: "#6B3FE0",
  KIDS: "#975600",
  SHOW: "#C2185B",
};

export const DANCE_ICONS: Record<string, LucideIcon> = { GROUP: Users, TRADITIONAL: Drum, MODERN: Music2, KIDS: Baby, SHOW: Sparkles };

export const danceColor = (category: string) => DANCE_COLORS[category] ?? DANCE_COLORS.GROUP;

export function DanceIcon({ category, className }: { category: string; className?: string }) {
  const Icon = DANCE_ICONS[category] ?? Sparkles;
  return <Icon className={className} />;
}

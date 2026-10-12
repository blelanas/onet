import { Baby, Drum, Music2, Sparkles, Users, type LucideIcon } from "lucide-react";

/** Accent colour per dance category (ONET accents: sky, coral, grape, sun, pink). */
export const DANCE_COLORS: Record<string, string> = {
  GROUP: "#1E9BD7",
  TRADITIONAL: "#FF6B4A",
  MODERN: "#7C4DFF",
  KIDS: "#FFB400",
  SHOW: "#E8457C",
};

export const DANCE_ICONS: Record<string, LucideIcon> = { GROUP: Users, TRADITIONAL: Drum, MODERN: Music2, KIDS: Baby, SHOW: Sparkles };

export const danceColor = (category: string) => DANCE_COLORS[category] ?? DANCE_COLORS.GROUP;

export function DanceIcon({ category, className }: { category: string; className?: string }) {
  const Icon = DANCE_ICONS[category] ?? Sparkles;
  return <Icon className={className} />;
}

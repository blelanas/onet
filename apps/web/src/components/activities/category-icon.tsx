import { Dumbbell, Gamepad2, GraduationCap, Hammer, Landmark, Mic2, Music, Palette, Sparkles, Trees, type LucideIcon } from "lucide-react";
import { CATEGORY_COLORS } from "@onet/shared";

export const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  SPORTS: Dumbbell,
  MUSIC: Music,
  SONGS: Mic2,
  EDUCATIONAL: GraduationCap,
  GAMES: Gamepad2,
  WORKSHOP: Hammer,
  CULTURAL: Landmark,
  CREATIVE: Palette,
  OUTDOOR: Trees,
};

export function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const I = ACTIVITY_ICONS[category] ?? Sparkles;
  return <I className={className} aria-hidden />;
}

export const categoryColor = (c: string) => CATEGORY_COLORS[c] ?? "#E30613";

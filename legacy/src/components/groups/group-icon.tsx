import { BookOpen, Compass, Flag, Globe, Heart, Leaf, Mountain, Music, Palette, Rocket, Smile, Sparkles, Star, Sun, Tent, Trophy, type LucideIcon } from "lucide-react";

export const GROUP_ICON_MAP: Record<string, LucideIcon> = {
  star: Star,
  compass: Compass,
  mountain: Mountain,
  rocket: Rocket,
  music: Music,
  palette: Palette,
  heart: Heart,
  sun: Sun,
  leaf: Leaf,
  trophy: Trophy,
  book: BookOpen,
  globe: Globe,
  flag: Flag,
  tent: Tent,
  sparkles: Sparkles,
  smile: Smile,
};

export function GroupIcon({ icon, className }: { icon?: string | null; className?: string }) {
  const I = GROUP_ICON_MAP[icon ?? "star"] ?? Star;
  return <I className={className} aria-hidden />;
}

import { Award, CalendarCheck, Compass, Footprints, Heart, Leaf, Lock, Medal, Music, Palette, Rocket, Star, Trophy, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Badge.icon (kebab-case lucide name) → component; unknown names fall back to an award. */
const ICONS: Record<string, LucideIcon> = {
  award: Award,
  "calendar-check": CalendarCheck,
  compass: Compass,
  footprints: Footprints,
  heart: Heart,
  leaf: Leaf,
  medal: Medal,
  music: Music,
  palette: Palette,
  rocket: Rocket,
  star: Star,
  trophy: Trophy,
  users: Users,
};

/** Round colored medal with the badge icon; greyed + padlock when locked. */
export function BadgeMedal({ icon, color, locked, size = "md", className }: { icon: string; color: string; locked?: boolean; size?: "sm" | "md" | "lg"; className?: string }) {
  const Icon = ICONS[icon] ?? Award;
  const dims = { sm: "size-10 [&_svg]:size-5", md: "size-14 [&_svg]:size-7", lg: "size-20 [&_svg]:size-9" }[size];
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center rounded-full text-white shadow-[var(--shadow-soft)]", dims, locked && "grayscale", className)}
      style={{ background: locked ? "#e7dfe9" : `radial-gradient(circle at 30% 25%, ${color}CC, ${color} 60%)`, boxShadow: locked ? undefined : `0 0 0 4px ${color}26` }}
      aria-hidden
    >
      <Icon className={locked ? "text-muted/60" : undefined} />
      {locked && (
        <span className="absolute -end-1 -bottom-1 grid size-6 place-items-center rounded-full bg-surface text-muted ring-2 ring-surface [&_svg]:!size-3.5">
          <Lock />
        </span>
      )}
    </span>
  );
}

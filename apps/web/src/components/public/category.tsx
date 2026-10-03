import {
  BookOpen,
  Bus,
  Cpu,
  Drama,
  Flag,
  Flame,
  GraduationCap,
  Hammer,
  HeartHandshake,
  HeartPulse,
  Landmark,
  Leaf,
  Map,
  Medal,
  Megaphone,
  MessagesSquare,
  Mic,
  Music,
  Music2,
  Newspaper,
  Palette,
  PartyPopper,
  Puzzle,
  Scale,
  Smile,
  Sparkles,
  Tent,
  Trees,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { CATEGORY_COLORS } from "@onet/shared";

/** Icons for every public-facing category value (activities, events, trips, songs, talks, news). */
const ICONS: Record<string, LucideIcon> = {
  SPORTS: Trophy,
  MUSIC: Music,
  SONGS: Mic,
  EDUCATIONAL: BookOpen,
  GAMES: Puzzle,
  WORKSHOP: Hammer,
  CULTURAL: Drama,
  CREATIVE: Palette,
  OUTDOOR: Trees,
  CHILDREN: Smile,
  COMPETITION: Medal,
  CELEBRATION: PartyPopper,
  PUBLIC: Users,
  MEETING: MessagesSquare,
  CAMPING: Tent,
  EXCURSION: Bus,
  REGIONAL: Map,
  ANTHEM: Flag,
  FOLK: Music2,
  CAMP: Flame,
  EDUCATION: GraduationCap,
  HEALTH: HeartPulse,
  PARENTING: HeartHandshake,
  CHILD_RIGHTS: Scale,
  ENVIRONMENT: Leaf,
  CULTURE: Landmark,
  TECHNOLOGY: Cpu,
  NEWS: Newspaper,
  EVENT: PartyPopper,
  ANNOUNCEMENT: Megaphone,
};

const EXTRA_COLORS: Record<string, string> = {
  NEWS: "#1E9BD7",
  EVENT: "#FF6B4A",
  ANNOUNCEMENT: "#7C4DFF",
  GENERAL: "#E30613",
  EVENTS: "#FF6B4A",
  TRIPS: "#1E9BD7",
  ACTIVITIES: "#2BB673",
};

export function categoryColor(category?: string | null) {
  if (!category) return "#E30613";
  return CATEGORY_COLORS[category] ?? EXTRA_COLORS[category] ?? "#E30613";
}

export function CategoryIcon({ category, className }: { category?: string | null; className?: string }) {
  const Icon = (category && ICONS[category]) || Sparkles;
  return <Icon className={className} aria-hidden />;
}

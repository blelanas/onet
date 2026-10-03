import { Bus, Drama, GraduationCap, Landmark, Map, Mountain, Palette, PartyPopper, Presentation, Smile, Tent, Trees, Trophy, Users } from "lucide-react";
import { intlLocale } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/constants";

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CULTURAL: Drama,
  CHILDREN: Smile,
  COMPETITION: Trophy,
  CELEBRATION: PartyPopper,
  WORKSHOP: Palette,
  PUBLIC: Users,
  MEETING: Presentation,
};
const TRIP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  EDUCATIONAL: GraduationCap,
  CAMPING: Tent,
  CULTURAL: Landmark,
  OUTDOOR: Trees,
  EXCURSION: Bus,
  REGIONAL: Map,
};

export function CategoryIcon({ kind, category, className }: { kind: "event" | "trip"; category: string; className?: string }) {
  const Icon = (kind === "event" ? EVENT_ICONS : TRIP_ICONS)[category] ?? Mountain;
  return <Icon className={className} />;
}

export function categoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? "#E30613";
}

/** Calendar-like date tile (day + short month), used on cards and heroes. */
export function DateTile({ date, locale, className, tone = "light" }: { date: Date; locale: string; className?: string; tone?: "light" | "solid" }) {
  const l = intlLocale(locale);
  const day = new Intl.DateTimeFormat(l, { day: "numeric" }).format(date);
  const month = new Intl.DateTimeFormat(l, { month: "short" }).format(date).replace(".", "");
  const weekday = new Intl.DateTimeFormat(l, { weekday: "short" }).format(date).replace(".", "");
  return (
    <div className={cn("flex w-14 flex-col items-center overflow-hidden rounded-2xl text-center shadow-[var(--shadow-soft)]", tone === "light" ? "bg-surface text-ink" : "bg-ink/80 text-white backdrop-blur", className)}>
      <span className="w-full bg-brand-600 py-0.5 text-[10px] font-extrabold tracking-wide text-white uppercase">{month}</span>
      <span className="font-display text-xl leading-7 font-extrabold tabular-nums">{day}</span>
      <span className="pb-1 text-[10px] font-bold text-muted uppercase">{weekday}</span>
    </div>
  );
}

/** Colored places-left meter. */
export function PlacesMeter({ taken, capacity, label, className }: { taken: number; capacity: number; label: string; className?: string }) {
  const pct = capacity ? Math.min(100, Math.round((taken / capacity) * 100)) : 0;
  const color = pct >= 100 ? "#7C4DFF" : pct >= 85 ? "#FF6B4A" : pct >= 60 ? "#FFB400" : "#2BB673";
  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs font-bold">
        <span style={{ color }}>{label}</span>
        <span className="text-muted tabular-nums" dir="ltr">
          {taken}/{capacity}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={taken} aria-valuemin={0} aria-valuemax={capacity} aria-label={label}>
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}B3, ${color})` }} />
      </div>
    </div>
  );
}

import { useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { CalendarClock, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CoverArt } from "@/components/ui/cover-art";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { CategoryIcon, categoryColor } from "./category-icon";

export type ActivityCardData = {
  id: string;
  title: string;
  category: string;
  coverUrl: string | null;
  status: string;
  ageMin: number | null;
  ageMax: number | null;
  durationMin: number;
  location: string | null;
  dayOfWeek: number | null;
  startTime: string | null;
  schedule: string | null;
  capacity: number;
  group?: { id: string; name: string; color: string } | null;
  _count: { participants: number };
};

export function ActivityCard({ a, variant = "default", highlight }: { a: ActivityCardData; variant?: "default" | "kid"; highlight?: string }) {
  const tc = useTranslations("common");
  const t = useTranslations("activities");
  const color = categoryColor(a.category);
  const kid = variant === "kid";
  const when = a.dayOfWeek != null ? `${tc(`enums.weekday.${a.dayOfWeek}`)}${a.startTime ? ` · ${a.startTime}` : ""}` : a.schedule;
  const full = a._count.participants >= a.capacity;
  return (
    <Link
      href={`/dashboard/activities/${a.id}`}
      className={cn("card card-hover group flex h-full flex-col overflow-hidden", kid && "rounded-3xl border-2 hover:-rotate-1")}
      style={kid ? { borderColor: `${color}55` } : undefined}
    >
      <CoverArt src={a.coverUrl} seed={a.id} color={color} icon={<CategoryIcon category={a.category} />} className={kid ? "h-40" : "h-36"} alt={a.title}>
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-extrabold shadow-sm" style={{ color }}>
            <CategoryIcon category={a.category} className="size-3.5" />
            {tc(`enums.activityCategory.${a.category}`)}
          </span>
          {a.status !== "ACTIVE" ? <StatusBadge status={a.status} className="bg-white/95" /> : highlight ? <Badge className="bg-white/95 text-ink ring-0">{highlight}</Badge> : null}
        </div>
        {a.ageMin != null && (
          <span className="absolute end-3 bottom-3 rounded-full bg-ink/70 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur">
            {a.ageMax != null ? t("ages", { min: a.ageMin, max: a.ageMax }) : t("agesFrom", { min: a.ageMin })}
          </span>
        )}
      </CoverArt>
      <div className="flex flex-1 flex-col p-4">
        <h3 className={cn("font-display font-extrabold text-ink group-hover:text-brand-700", kid ? "text-xl" : "text-lg leading-snug")}>{a.title}</h3>
        <ul className="mt-2 space-y-1 text-sm text-ink-2">
          {when && (
            <li className="flex items-center gap-2">
              <CalendarClock className="size-4 shrink-0" style={{ color }} />
              <span className="truncate">
                {when} · {tc("fields.minutes", { count: a.durationMin })}
              </span>
            </li>
          )}
          {a.location && (
            <li className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" style={{ color }} />
              <span className="truncate">{a.location}</span>
            </li>
          )}
        </ul>
        <div className="min-h-3 flex-1" />
        <div className="mt-3 flex items-center gap-3">
          {a.group && (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-bold text-ink-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: a.group.color }} />
              <span className="truncate">{a.group.name}</span>
            </span>
          )}
          {!kid && (
            <span className="ms-auto flex shrink-0 items-center gap-1 text-xs font-bold text-muted">
              <Users className="size-3.5" />
              <span className={full ? "text-red-600" : undefined}>
                {a._count.participants}/{a.capacity}
              </span>
            </span>
          )}
        </div>
        {!kid && <Progress value={a._count.participants} max={a.capacity} color={full ? "#E30613" : color} className="mt-2 h-1.5" />}
      </div>
    </Link>
  );
}

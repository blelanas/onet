import { useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { CalendarClock, MapPin, Sparkles, Users } from "lucide-react";
import { AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { GroupIcon } from "./group-icon";

export type GroupCardData = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  ageMin: number | null;
  ageMax: number | null;
  capacity: number;
  meetingDay: number | null;
  meetingTime: string | null;
  schedule: string | null;
  location: string | null;
  isActive: boolean;
  monitors: { isLead: boolean; member: { firstName: string; lastName: string; photoUrl: string | null } }[];
  _count: { children: number; activities: number };
};

export function GroupCard({ g, mine }: { g: GroupCardData; mine?: boolean }) {
  const t = useTranslations("groups");
  const tc = useTranslations("common");
  const fill = g.capacity ? Math.round((g._count.children / g.capacity) * 100) : 0;
  const full = g._count.children >= g.capacity;
  const lead = g.monitors.find((m) => m.isLead) ?? g.monitors[0];
  return (
    <Link href={`/dashboard/groups/${g.id}`} className={cn("card card-hover group relative flex flex-col overflow-hidden", !g.isActive && "opacity-70")}>
      <div className="relative h-24 overflow-hidden" style={{ background: `linear-gradient(135deg, ${g.color}, ${g.color}C0 60%, ${g.color}80)` }}>
        <div className="bg-confetti absolute inset-0 opacity-60" />
        <svg className="absolute -end-8 -top-10 size-40 text-white/15 transition-transform duration-500 group-hover:rotate-12" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="50" fill="currentColor" />
        </svg>
        <div className="absolute start-4 top-4 flex gap-1.5">
          {mine && <Badge className="bg-white/90 text-ink ring-0">{t("card.mine")}</Badge>}
          {!g.isActive && <Badge className="bg-white/90 text-ink ring-0">{tc("status.INACTIVE")}</Badge>}
        </div>
        {g.ageMin != null && (
          <span className="absolute end-4 top-4 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-extrabold" style={{ color: g.color }}>
            {g.ageMax != null ? t("card.ages", { min: g.ageMin, max: g.ageMax }) : t("card.agesFrom", { min: g.ageMin })}
          </span>
        )}
      </div>
      <div className="-mt-9 flex flex-1 flex-col px-5 pb-5">
        <div className="grid size-16 place-items-center rounded-2xl border-4 border-surface text-white shadow-[var(--shadow-lift)] transition-transform group-hover:scale-105" style={{ background: g.color }}>
          <GroupIcon icon={g.icon} className="size-7" />
        </div>
        <h3 className="mt-3 font-display text-xl font-extrabold text-ink">{g.name}</h3>
        {g.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{g.description}</p>}

        <ul className="mt-3 space-y-1.5 text-sm text-ink-2">
          {(g.meetingDay != null || g.schedule) && (
            <li className="flex items-center gap-2">
              <CalendarClock className="size-4 shrink-0" style={{ color: g.color }} />
              <span className="truncate">{g.meetingDay != null ? `${tc(`enums.weekday.${g.meetingDay}`)}${g.meetingTime ? ` · ${g.meetingTime}` : ""}` : g.schedule}</span>
            </li>
          )}
          {g.location && (
            <li className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" style={{ color: g.color }} />
              <span className="truncate">{g.location}</span>
            </li>
          )}
          <li className="flex items-center gap-2">
            <Sparkles className="size-4 shrink-0" style={{ color: g.color }} />
            <span>{t("card.activities", { count: g._count.activities })}</span>
          </li>
        </ul>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1 text-ink-2">
              <Users className="size-3.5" /> {t("card.fill", { count: g._count.children, capacity: g.capacity })}
            </span>
            <span className={full ? "text-red-600" : "text-muted"}>{full ? tc("status.FULL") : `${fill}%`}</span>
          </div>
          <Progress value={g._count.children} max={g.capacity} color={full ? "#E30613" : g.color} />
        </div>

        <div className="min-h-4 flex-1" />
        <div className="flex items-center justify-between gap-2 border-t border-line pt-4">
          {g.monitors.length ? (
            <div className="flex min-w-0 items-center gap-2">
              <AvatarStack people={g.monitors.map((m) => m.member)} max={3} />
              {lead && (
                <span className="min-w-0 truncate text-xs text-muted">
                  {lead.member.firstName} {lead.member.lastName}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs font-semibold text-muted">{t("card.noMonitor")}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

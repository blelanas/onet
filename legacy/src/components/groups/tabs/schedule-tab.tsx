import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { formatDate, intlLocale } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { addDaysLocal, normalizeDay } from "@/server/attendance/day";
import { groupActivities, type getGroup } from "@/server/groups/queries";
import { Section } from "@/components/ui/section";
import { CategoryIcon, categoryColor } from "@/components/activities/category-icon";
import { GroupIcon } from "../group-icon";

type Group = Awaited<ReturnType<typeof getGroup>>;
const WEEK = [1, 2, 3, 4, 5, 6, 0];

export async function ScheduleTab({ group }: { group: Group }) {
  const t = await getTranslations("groups.schedule");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const activities = (await groupActivities(group.id)).filter((a) => a.status === "ACTIVE" && a.dayOfWeek != null);
  const today = normalizeDay();

  const upcoming: Date[] = [];
  if (group.meetingDay != null) {
    let d = addDaysLocal(today, (group.meetingDay - today.getDay() + 7) % 7);
    for (let i = 0; i < 6; i++) {
      upcoming.push(d);
      d = addDaysLocal(d, 7);
    }
  }

  return (
    <div className="space-y-5">
      <Section title={t("week")}>
        <ol className="grid gap-2 md:grid-cols-7">
          {WEEK.map((dow) => {
            const meeting = group.meetingDay === dow;
            const acts = activities.filter((a) => a.dayOfWeek === dow).sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
            const isToday = today.getDay() === dow;
            return (
              <li key={dow} className={cn("flex gap-2 rounded-2xl border p-2 md:min-h-44 md:flex-col", isToday ? "border-brand-200 bg-brand-50/50" : "border-line")}>
                <p className={cn("w-20 shrink-0 pt-1 text-xs font-extrabold uppercase md:w-auto md:pt-0", isToday ? "text-brand-700" : "text-muted")}>{tc(`enums.weekday.${dow}`)}</p>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  {meeting && (
                    <div className="rounded-xl p-2 text-white" style={{ background: group.color }}>
                      <p className="flex items-center gap-1 text-[11px] font-extrabold">
                        <GroupIcon icon={group.icon} className="size-3" /> {t("meeting")}
                      </p>
                      {group.meetingTime && (
                        <p className="text-xs font-bold" dir="ltr">
                          {group.meetingTime}
                        </p>
                      )}
                    </div>
                  )}
                  {acts.map((a) => (
                    <Link key={a.id} href={`/dashboard/activities/${a.id}`} className="block rounded-xl p-2 text-xs transition hover:brightness-95" style={{ background: `${categoryColor(a.category)}1A`, color: categoryColor(a.category) }}>
                      <span className="flex items-start gap-1 font-extrabold leading-tight">
                        <CategoryIcon category={a.category} className="mt-px size-3 shrink-0" />
                        <span className="line-clamp-2">{a.title}</span>
                      </span>
                      {a.startTime && (
                        <span className="font-bold opacity-80" dir="ltr">
                          {a.startTime}
                        </span>
                      )}
                    </Link>
                  ))}
                  {!meeting && !acts.length && <span className="hidden text-center text-lg text-line md:block">·</span>}
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section title={t("next")}>
        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-2">
          {group.schedule && (
            <p className="flex items-center gap-2">
              <Clock className="size-4 text-muted" /> {group.schedule}
            </p>
          )}
          {group.location && (
            <p className="flex items-center gap-2">
              <MapPin className="size-4 text-muted" /> {group.location}
            </p>
          )}
        </div>
        {upcoming.length ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((d, i) => (
              <li key={d.toISOString()} className={cn("flex items-center gap-3 rounded-2xl border p-2.5", i === 0 ? "border-transparent text-white" : "border-line")} style={i === 0 ? { background: group.color } : undefined}>
                <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl text-center leading-none", i === 0 ? "bg-white/20" : "bg-surface-2")}>
                  <span>
                    <span className="block font-display text-lg font-extrabold">{d.getDate()}</span>
                    <span className="block text-[10px] font-bold uppercase">{new Intl.DateTimeFormat(intlLocale(locale), { month: "short" }).format(d)}</span>
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold">{formatDate(d, locale, "long")}</span>
                  {group.meetingTime && (
                    <span className={cn("text-xs", i === 0 ? "text-white/85" : "text-muted")} dir="ltr">
                      {group.meetingTime}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted">
            <CalendarDays className="size-4" /> {t("noMeeting")}
          </p>
        )}
      </Section>
    </div>
  );
}

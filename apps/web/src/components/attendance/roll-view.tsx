import { useLocale, useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, ExternalLink } from "lucide-react";
import type { rollPage } from "@api/modules/attendance/routes";
import { formatDate, formatDateTime } from "@onet/shared";
import { useApi } from "@/lib/query";
import type { Loaded } from "@/lib/types";
import { ageFrom } from "@/lib/utils";
import { normalizeDay } from "@/components/attendance/day";
import { QueryView } from "@/components/states/page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon, categoryColor } from "@/components/activities/category-icon";
import { ContextBar } from "./context-bar";
import { RollCall } from "./roll-call";

type Data = Loaded<typeof rollPage>;

export function RollView({ ctxParam, dateParam }: { ctxParam?: string; dateParam?: string }) {
  const query = useApi<Data>("/attendance/roll", { ctx: ctxParam, date: dateParam });
  return (
    <QueryView query={query} skeleton={<Skeleton className="h-96 rounded-2xl" />}>
      {(data) => <RollPanel data={data} />}
    </QueryView>
  );
}

function RollPanel({ data }: { data: Data }) {
  const t = useTranslations("attendance");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { options, roll } = data;
  if (!roll)
    return (
      <div className="card">
        <EmptyState title={t("roll.noContext")} description={t("roll.noContextHint")} icon={<ClipboardCheck className="size-4" />} />
      </div>
    );

  const { opt, future, offDay } = roll;
  const date = normalizeDay(roll.date);
  const roster = roll;
  const color = opt.kind === "group" ? opt.color : categoryColor(opt.category ?? "");
  const href = opt.kind === "group" ? `/dashboard/groups/${opt.id}` : `/dashboard/activities/${opt.id}`;

  return (
    <>
      <ContextBar options={options} ctx={opt.key} date={roll.date} prevDate={roll.prevDate} nextDate={roll.nextDate ?? undefined} />

      <div className="relative mb-5 overflow-hidden rounded-3xl p-5 text-white shadow-[var(--shadow-lift)]" style={{ background: `linear-gradient(120deg, ${color}, ${color}C0 65%, ${color}90)` }}>
        <div className="bg-confetti absolute inset-0 opacity-50" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/20 backdrop-blur">
            {opt.kind === "activity" ? <CategoryIcon category={opt.category ?? ""} className="size-7" /> : <ClipboardCheck className="size-7" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold tracking-wide text-white/80 uppercase">{opt.kind === "group" ? t("groupSession") : t("activitySession")}</p>
            <h2 className="truncate font-display text-2xl font-extrabold">{opt.name}</h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-white/90">
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="size-4" /> {formatDate(date, locale, "long")}
                {opt.time && ` · ${opt.time}`}
              </span>
              <span>{t("roll.count", { count: roster.members.length })}</span>
            </p>
          </div>
          <Link href={href} className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold backdrop-blur hover:bg-white/30">
            {tc("actions.open")} <ExternalLink className="size-3.5" />
          </Link>
        </div>
        <p className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">
          {roster.recordedAt ? (
            <>
              <CheckCircle2 className="size-4" /> {t("roll.recordedAt", { at: formatDateTime(roster.recordedAt, locale) })}
            </>
          ) : (
            t("roll.notRecorded")
          )}
        </p>
      </div>

      {(future || offDay) && (
        <p className="mb-4 flex items-center gap-2 rounded-2xl bg-sun-soft px-4 py-3 text-sm font-semibold text-amber-800">
          <AlertTriangle className="size-4 shrink-0" /> {future ? t("roll.future") : t("roll.offDay", { day: tc(`enums.weekday.${opt.day}`) })}
        </p>
      )}

      {roster.members.length ? (
        <RollCall
          key={`${opt.key}|${roll.date}`}
          contextKey={opt.key}
          date={roll.date}
          color={color}
          initial={roster.statuses}
          members={roster.members.map((m) => ({ id: m.id, firstName: m.firstName, lastName: m.lastName, photoUrl: m.photoUrl, age: ageFrom(m.dateOfBirth), medical: m.medical }))}
        />
      ) : (
        <div className="card">
          <EmptyState title={t("roll.emptyRoster")} description={t("roll.emptyRosterHint")} action={<Link href={href} className="font-bold text-brand-700">{opt.name}</Link>} />
        </div>
      )}
    </>
  );
}

import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { can, requirePagePermission } from "@/lib/auth/guards";
import { formatDate, formatDateTime, intlLocale, toDateInput, toDateTimeInput } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { addDaysLocal, dayKey, normalizeDay, parseDayParam, startOfMonth, startOfWeek } from "@/server/attendance/day";
import { CAL_KINDS, KIND_COLORS, calendarGroupOptions, calendarItems, getEntry, type CalKind } from "@/server/calendar/queries";
import { buttonClasses } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { FilterSelect } from "@/components/ui/toolbar";
import { AgendaList, KIND_ICONS, MonthGrid, WeekColumns } from "@/components/calendar/calendar-views";
import { EntryDialog, NewEntryButton, type EntryView } from "@/components/calendar/entry-dialog";

type SP = Record<string, string | string[] | undefined>;
const VIEWS = ["month", "week", "agenda"] as const;

export async function generateMetadata() {
  const t = await getTranslations("calendar");
  return { title: t("title") };
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePagePermission("calendar.read");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const t = await getTranslations("calendar");
  const tn = await getTranslations("nav");
  const locale = await getLocale();
  const L = intlLocale(locale);

  const view = (VIEWS as readonly string[]).includes(str("view") ?? "") ? (str("view") as (typeof VIEWS)[number]) : "month";
  const today = normalizeDay();
  const anchor = parseDayParam(str("d")) ?? today;
  const typesParam = str("types");
  const kinds: CalKind[] = typesParam ? (typesParam.split(",").filter((k) => (CAL_KINDS as readonly string[]).includes(k)) as CalKind[]) : [...CAL_KINDS];
  const personal = user.roles.some((r) => r === "parent" || r === "kid" || r === "monitor");
  const defaultMine = user.roles.includes("parent") || (user.roles.includes("kid") && user.roles.length === 1);
  const mine = personal && (str("scope") ? str("scope") === "mine" : defaultMine);
  const groups = await calendarGroupOptions(user);
  const groupId = groups.some((g) => g.id === str("group")) ? str("group") : undefined;

  // Visible range
  let days: Date[];
  let title: string;
  let prev: Date;
  let next: Date;
  if (view === "week") {
    const s = startOfWeek(anchor);
    days = Array.from({ length: 7 }, (_, i) => addDaysLocal(s, i));
    const e = days[6];
    title = `${new Intl.DateTimeFormat(L, { day: "numeric", month: "short" }).format(s)} – ${new Intl.DateTimeFormat(L, { day: "numeric", month: "short", year: "numeric" }).format(e)}`;
    prev = addDaysLocal(s, -7);
    next = addDaysLocal(s, 7);
  } else {
    const m = startOfMonth(anchor);
    const gridStart = startOfWeek(m);
    const monthDays = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const cells = Math.ceil(((m.getDay() + 6) % 7 + monthDays) / 7) * 7;
    days = view === "month" ? Array.from({ length: cells }, (_, i) => addDaysLocal(gridStart, i)) : Array.from({ length: monthDays }, (_, i) => addDaysLocal(m, i));
    title = new Intl.DateTimeFormat(L, { month: "long", year: "numeric" }).format(m);
    prev = new Date(m.getFullYear(), m.getMonth() - 1, 1);
    next = new Date(m.getFullYear(), m.getMonth() + 1, 1);
  }
  const monthDaysOnly = view === "month" ? days.filter((d) => d.getMonth() === startOfMonth(anchor).getMonth()) : days;
  const items = await calendarItems(user, { from: days[0], to: addDaysLocal(days[days.length - 1], 1), kinds, groupId, mine });

  const href = (patch: Record<string, string | null>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && k !== "entry") q.set(k, v);
    for (const [k, v] of Object.entries(patch)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    const s = q.toString();
    return `/dashboard/calendar${s ? `?${s}` : ""}`;
  };
  const entryBase = href({});
  const toggleKind = (k: CalKind) => {
    const set = new Set(kinds);
    if (set.has(k)) set.delete(k);
    else set.add(k);
    return href({ types: set.size === CAL_KINDS.length || set.size === 0 ? null : [...set].join(",") });
  };

  // Entry dialog (?entry=)
  let entry: EntryView | null = null;
  const entryId = str("entry");
  if (entryId) {
    const e = await getEntry(user, entryId).catch(() => null);
    if (e)
      entry = {
        id: e.id,
        title: e.title,
        description: e.description,
        type: e.type,
        allDay: e.allDay,
        location: e.location,
        audience: e.audience,
        startDay: toDateInput(e.startAt),
        endDay: toDateInput(e.endAt),
        startAt: toDateTimeInput(e.startAt),
        endAt: toDateTimeInput(e.endAt),
        whenLabel: e.allDay ? `${formatDate(e.startAt, locale, "long")}${e.endAt ? ` → ${formatDate(e.endAt, locale, "long")}` : ""}` : `${formatDateTime(e.startAt, locale)}${e.endAt ? ` → ${formatDateTime(e.endAt, locale)}` : ""}`,
        author: e.createdBy?.name ?? null,
      };
  }
  const canManage = can(user, "calendar.manage");
  const navBtn = "grid size-10 place-items-center rounded-xl border border-line bg-surface text-ink-2 transition hover:bg-surface-2";

  return (
    <>
      <PageHeader
        title={t("title")}
        description={mine ? t("descriptionMine") : t("description")}
        icon={<CalendarDays className="size-6" />}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title") }]}
        actions={canManage ? <NewEntryButton defaultDay={dayKey(anchor < today && view !== "week" ? today : anchor)} /> : undefined}
      />

      {/* Navigation + view switch */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Link href={href({ d: dayKey(prev) })} className={navBtn} aria-label={t("previous")} scroll={false}>
            <ChevronLeft className="rtl-flip size-5" />
          </Link>
          <Link href={href({ d: null })} className={buttonClasses("outline", "md")} scroll={false}>
            {t("today")}
          </Link>
          <Link href={href({ d: dayKey(next) })} className={navBtn} aria-label={t("next")} scroll={false}>
            <ChevronRight className="rtl-flip size-5" />
          </Link>
          <h2 className="ms-2 font-display text-xl font-extrabold text-ink capitalize sm:text-2xl">{title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {personal && (
            <div className="flex rounded-xl border border-line bg-surface p-1" role="tablist" aria-label={t("scope.label")}>
              {(["mine", "all"] as const).map((s) => (
                <Link key={s} href={href({ scope: s })} scroll={false} role="tab" aria-selected={(s === "mine") === mine} className={cn("rounded-lg px-3 py-1.5 text-sm font-bold transition", (s === "mine") === mine ? "bg-grape text-white shadow-sm" : "text-ink-2 hover:bg-surface-2")}>
                  {t(`scope.${s}`)}
                </Link>
              ))}
            </div>
          )}
          <div className="flex rounded-xl border border-line bg-surface p-1" role="tablist" aria-label={t("views.label")}>
            {VIEWS.map((v) => (
              <Link key={v} href={href({ view: v === "month" ? null : v })} scroll={false} role="tab" aria-selected={v === view} className={cn("rounded-lg px-3 py-1.5 text-sm font-bold transition", v === view ? "bg-ink text-white shadow-sm" : "text-ink-2 hover:bg-surface-2")}>
                {t(`views.${v}`)}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:flex-wrap md:overflow-visible">
          {CAL_KINDS.map((k) => {
            const on = kinds.includes(k);
            const I = KIND_ICONS[k];
            return (
              <Link
                key={k}
                href={toggleKind(k)}
                scroll={false}
                aria-pressed={on}
                className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold transition", on ? "border-transparent text-white shadow-sm" : "border-line bg-surface text-muted line-through decoration-2 hover:text-ink-2")}
                style={on ? { background: KIND_COLORS[k] } : undefined}
              >
                <I className="size-4" /> {t(`kinds.${k}`)}
              </Link>
            );
          })}
        </div>
        {groups.length > 1 && <FilterSelect param="group" allLabel={t("allGroups")} options={groups.map((g) => ({ value: g.id, label: g.name }))} className="md:ms-auto" />}
      </div>

      {view === "month" && (
        <>
          <div className="hidden md:block">
            <MonthGrid days={days} month={startOfMonth(anchor).getMonth()} items={items} entryBase={entryBase} />
          </div>
          <div className="md:hidden">
            <AgendaList days={monthDaysOnly} items={items} entryBase={entryBase} />
          </div>
        </>
      )}
      {view === "week" && (
        <>
          <div className="hidden lg:block">
            <WeekColumns days={days} items={items} entryBase={entryBase} />
          </div>
          <div className="lg:hidden">
            <AgendaList days={days} items={items} entryBase={entryBase} />
          </div>
        </>
      )}
      {view === "agenda" && <AgendaList days={days} items={items} entryBase={entryBase} />}

      {entry && <EntryDialog key={entry.id} entry={entry} canManage={canManage} />}
    </>
  );
}

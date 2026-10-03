import { useLocale, useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { ArrowRight, CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { CoverArt } from "@/components/ui/cover-art";
import { formatMoney } from "@onet/shared";
import { formatDate } from "@onet/shared";
import { cn } from "@/lib/utils";
import type { PublicActivity, PublicEvent, PublicNews, PublicTrip } from "@api/modules/public/queries";
import { CategoryIcon, categoryColor } from "./category";
import { clock, dateRange, dayMonth, daysBetween } from "./format";

type Tr = Awaited<ReturnType<typeof useTranslations>>;

export function ageLabel(t: Tr, min?: number | null, max?: number | null) {
  if (min != null && max != null) return t("ages", { min, max });
  if (min != null) return t("agesFrom", { min });
  return t("allAges");
}

function DateChip({ date, locale, color }: { date: Date; locale: string; color: string }) {
  const { day, month } = dayMonth(date, locale);
  return (
    <div className="absolute start-3 top-3 grid min-w-14 place-items-center rounded-2xl bg-white px-2 py-1.5 text-center shadow-lg">
      <span className="font-display text-2xl leading-none font-extrabold text-ink" dir="ltr">
        {day}
      </span>
      <span className="text-[11px] font-extrabold tracking-wide uppercase" style={{ color }}>
        {month}
      </span>
    </div>
  );
}

function CategoryTag({ label, color, className }: { label: string; color: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-extrabold shadow-sm", className)} style={{ color }}>
      <span className="size-1.5 rounded-full" style={{ background: color }} aria-hidden />
      {label}
    </span>
  );
}

export function PlacesPill({ left, past, className }: { left: number; past?: boolean; className?: string }) {
  const tc = useTranslations("common.fields");
  const tp = useTranslations("public.common");
  if (past) return <span className={cn("rounded-full bg-surface-2 px-2.5 py-1 text-xs font-extrabold text-muted", className)}>{tp("past")}</span>;
  const tone = left === 0 ? "bg-red-50 text-red-700" : left <= 10 ? "bg-sun-soft text-amber-700" : "bg-leaf-soft text-emerald-700";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold", tone, className)}>
      <Users className="size-3.5" aria-hidden />
      {tc("placesLeft", { count: left })}
    </span>
  );
}

function Price({ millimes }: { millimes: number }) {
  const t = useTranslations("public.common");
  const locale = useLocale();
  return <span className="font-display text-lg font-extrabold text-ink">{millimes > 0 ? formatMoney(millimes, locale) : t("free")}</span>;
}

const cardBase = "group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-soft)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] focus-within:ring-4 focus-within:ring-brand-100";
const stretched = "after:absolute after:inset-0 after:content-[''] focus:outline-none";

export function EventCard({ event, headingLevel = 3 }: { event: PublicEvent; headingLevel?: 2 | 3 }) {
  const tc = useTranslations("common");
  const locale = useLocale();
  const color = categoryColor(event.category);
  const past = event.endAt < new Date();
  const H = `h${headingLevel}` as "h2" | "h3";
  return (
    <article className={cardBase}>
      <CoverArt src={event.coverUrl} seed={event.id} color={color} icon={<CategoryIcon category={event.category} />} className="h-40">
        <DateChip date={event.startAt} locale={locale} color={color} />
        <CategoryTag label={tc(`enums.eventCategory.${event.category}`)} color={color} className="absolute end-3 top-3" />
      </CoverArt>
      <div className="flex flex-1 flex-col p-5">
        <H className="line-clamp-2 text-lg leading-snug font-extrabold text-ink">
          <Link href={`/events/${event.id}`} className={stretched}>
            {event.title}
          </Link>
        </H>
        <ul className="mt-3 space-y-1.5 text-sm text-ink-2">
          <li className="flex items-center gap-2">
            <Clock className="size-4 shrink-0 text-muted" aria-hidden />
            <span className="truncate">
              {formatDate(event.startAt, locale)} · {clock(event.startAt, locale)}
            </span>
          </li>
          {event.location && (
            <li className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-muted" aria-hidden />
              <span className="truncate">{event.location}</span>
            </li>
          )}
        </ul>
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <PlacesPill left={event.left} past={past} />
          <Price millimes={event.price} />
        </div>
      </div>
    </article>
  );
}

export function TripCard({ trip, headingLevel = 3 }: { trip: PublicTrip; headingLevel?: 2 | 3 }) {
  const tc = useTranslations("common");
  const tp = useTranslations("public.common");
  const td = useTranslations("public.details");
  const locale = useLocale();
  const color = categoryColor(trip.category);
  const past = trip.returnAt < new Date() || trip.status === "COMPLETED";
  const H = `h${headingLevel}` as "h2" | "h3";
  const days = daysBetween(trip.departAt, trip.returnAt);
  return (
    <article className={cardBase}>
      <CoverArt src={trip.coverUrl} seed={trip.id} color={color} icon={<CategoryIcon category={trip.category} />} className="h-44">
        <DateChip date={trip.departAt} locale={locale} color={color} />
        <CategoryTag label={tc(`enums.tripCategory.${trip.category}`)} color={color} className="absolute end-3 top-3" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent px-4 pt-8 pb-3">
          <p className="flex items-center gap-1.5 font-display text-xl font-extrabold text-white drop-shadow">
            <MapPin className="size-4" aria-hidden /> {trip.destination}
          </p>
        </div>
      </CoverArt>
      <div className="flex flex-1 flex-col p-5">
        <H className="line-clamp-2 text-lg leading-snug font-extrabold text-ink">
          <Link href={`/trips/${trip.id}`} className={stretched}>
            {trip.title}
          </Link>
        </H>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink-2">
          <li className="flex items-center gap-1.5">
            <CalendarDays className="size-4 text-muted" aria-hidden />
            {dateRange(trip.departAt, trip.returnAt, locale)}
          </li>
          <li className="flex items-center gap-1.5">
            <Clock className="size-4 text-muted" aria-hidden />
            {td("days", { count: days })}
          </li>
          <li className="flex items-center gap-1.5">
            <Users className="size-4 text-muted" aria-hidden />
            {ageLabel(tp, trip.ageMin, trip.ageMax)}
          </li>
        </ul>
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          {trip.status === "CANCELLED" ? (
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-extrabold text-red-700">{tc("status.CANCELLED")}</span>
          ) : (
            <PlacesPill left={trip.status === "FULL" ? 0 : trip.left} past={past} />
          )}
          <Price millimes={trip.price} />
        </div>
      </div>
    </article>
  );
}

export function ActivityCard({ activity, headingLevel = 3 }: { activity: PublicActivity; headingLevel?: 2 | 3 }) {
  const tc = useTranslations("common");
  const tp = useTranslations("public.common");
  const color = categoryColor(activity.category);
  const H = `h${headingLevel}` as "h2" | "h3";
  const when = activity.dayOfWeek != null && activity.startTime ? tp("weekly", { day: tc(`enums.weekday.${activity.dayOfWeek}`), time: activity.startTime }) : activity.schedule;
  return (
    <article className={cn(cardBase, "hover:-translate-y-1")}>
      <CoverArt src={activity.coverUrl} seed={activity.id} color={color} icon={<CategoryIcon category={activity.category} />} className="h-32">
        <CategoryTag label={tc(`enums.activityCategory.${activity.category}`)} color={color} className="absolute start-3 top-3" />
      </CoverArt>
      <div className="flex flex-1 flex-col p-5">
        <H className="text-lg leading-snug font-extrabold text-ink">{activity.title}</H>
        {activity.description && <p dir="auto" className="mt-1.5 line-clamp-2 text-sm text-muted">{activity.description}</p>}
        <ul className="mt-auto space-y-1.5 pt-4 text-sm text-ink-2">
          {when && (
            <li className="flex items-center gap-2">
              <CalendarDays className="size-4 shrink-0" style={{ color }} aria-hidden />
              <span className="truncate">{when}</span>
              <span className="ms-auto shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold text-muted">{tp("duration", { count: activity.durationMin })}</span>
            </li>
          )}
          <li className="flex items-center gap-2">
            <Users className="size-4 shrink-0" style={{ color }} aria-hidden />
            {ageLabel(tp, activity.ageMin, activity.ageMax)}
          </li>
          {activity.location && (
            <li className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" style={{ color }} aria-hidden />
              <span className="truncate">{activity.location}</span>
            </li>
          )}
        </ul>
      </div>
    </article>
  );
}

export function NewsCard({ post, headingLevel = 3, featured }: { post: PublicNews; headingLevel?: 2 | 3; featured?: boolean }) {
  const tn = useTranslations("public.newsCategory");
  const tp = useTranslations("public.common");
  const locale = useLocale();
  const color = categoryColor(post.category);
  const H = `h${headingLevel}` as "h2" | "h3";
  const label = tn.has(post.category) ? tn(post.category) : post.category;
  return (
    <article className={cn(cardBase, featured && "md:flex-row")}>
      <CoverArt src={post.coverUrl} seed={post.slug} color={color} icon={<CategoryIcon category={post.category} />} className={cn("h-44 shrink-0", featured && "md:h-auto md:min-h-72 md:w-1/2")}>
        <CategoryTag label={label} color={color} className="absolute start-3 top-3" />
      </CoverArt>
      <div className={cn("flex flex-1 flex-col p-5", featured && "md:p-8")}>
        <p className="text-xs font-bold text-muted">
          <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt, locale, "long")}</time>
        </p>
        <H className={cn("mt-1.5 leading-snug font-extrabold text-ink", featured ? "text-2xl sm:text-3xl" : "line-clamp-2 text-lg")}>
          <Link href={`/news/${post.slug}`} className={stretched}>
            {post.title}
          </Link>
        </H>
        {post.excerpt && <p dir="auto" className={cn("mt-2 text-sm text-muted", featured ? "text-base" : "line-clamp-3")}>{post.excerpt}</p>}
        <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-extrabold" style={{ color }}>
          {tp("readMore")}
          <ArrowRight className="rtl-flip size-4 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" aria-hidden />
        </span>
      </div>
    </article>
  );
}

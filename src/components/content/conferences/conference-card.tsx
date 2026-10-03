import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Headphones, MapPin, Mic2, Video } from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/constants";
import { intlLocale } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { CoverArt } from "@/components/ui/cover-art";

type ConferenceRow = { id: string; title: string; speaker: string; category: string; date: Date; location: string | null; coverUrl: string | null; mediaUrl: string | null; mediaType: string | null };

export function speakerNames(speaker: string) {
  const parts = speaker.replace(/^(m\.|mme|mlle|dr\.?|pr\.?)\s+/i, "").split(/\s+/);
  return { firstName: parts[0] ?? speaker, lastName: parts.slice(1).join(" ") };
}

/** 24-hour time ("18:00") in every locale. */
export function timeOf(date: Date, locale: string) {
  return new Intl.DateTimeFormat(intlLocale(locale), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

/** Calendar-style date tile (day number + month). */
export function DateTile({ date, locale, className }: { date: Date; locale: string; className?: string }) {
  const il = intlLocale(locale);
  return (
    <div className={cn("flex w-14 shrink-0 flex-col items-center overflow-hidden rounded-2xl bg-surface text-center shadow-[var(--shadow-soft)] ring-1 ring-line", className)}>
      <span className="w-full bg-brand-600 py-0.5 text-[10px] font-extrabold tracking-wide text-white uppercase">{new Intl.DateTimeFormat(il, { month: "short" }).format(date)}</span>
      <span className="pt-0.5 text-2xl leading-none font-extrabold text-ink">{new Intl.DateTimeFormat(il, { day: "numeric" }).format(date)}</span>
      <span className="pb-1 text-[10px] font-bold text-muted">{new Intl.DateTimeFormat(il, { weekday: "short" }).format(date)}</span>
    </div>
  );
}

export async function ConferenceCard({ conf, past }: { conf: ConferenceRow; past?: boolean }) {
  const locale = await getLocale();
  const t = await getTranslations("content.conferences");
  const tc = await getTranslations("common");
  const color = CATEGORY_COLORS[conf.category] ?? "#1E9BD7";
  const sp = speakerNames(conf.speaker);
  return (
    <Link href={`/dashboard/content/conferences/${conf.id}`} className="card card-hover group flex animate-[var(--animate-fade-up)] flex-col overflow-hidden">
      <CoverArt src={conf.coverUrl} seed={conf.id} color={color} icon={<Mic2 />} className={cn("aspect-[16/8]", past && "grayscale-[35%]")}>
        <span className="absolute start-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-extrabold shadow-sm" style={{ color }}>
          {tc(`enums.conferenceCategory.${conf.category}`)}
        </span>
        {conf.mediaUrl && (
          <span className="absolute end-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-xs font-extrabold text-white backdrop-blur-sm">
            {conf.mediaType === "VIDEO" ? <Video className="size-3.5" /> : <Headphones className="size-3.5" />} {t("recording")}
          </span>
        )}
      </CoverArt>
      <div className="flex flex-1 gap-3 p-4">
        <DateTile date={conf.date} locale={locale} className="relative -mt-9 self-start" />
        <div className="min-w-0 flex-1">
          <h3 dir="auto" className="ltr:text-left rtl:text-right line-clamp-2 leading-snug font-extrabold text-ink group-hover:text-brand-700">{conf.title}</h3>
          <p className="mt-1 text-xs font-bold text-muted tabular-nums">{timeOf(conf.date, locale)}</p>
          {conf.location && (
            <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted">
              <MapPin className="size-3.5 shrink-0" /> <span className="truncate">{conf.location}</span>
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-line px-4 py-3">
        <Avatar firstName={sp.firstName} lastName={sp.lastName} size="sm" />
        <span className="truncate text-sm font-bold text-ink-2">{conf.speaker}</span>
      </div>
    </Link>
  );
}

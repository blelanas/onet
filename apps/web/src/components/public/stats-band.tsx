import { useLocale, useTranslations } from "use-intl";
import { CalendarDays, Music, Palette, Smile, Tent, UserRoundCheck } from "lucide-react";
import { intlLocale } from "@onet/shared";

type Stats = { children: number; monitors: number; activities: number; events: number; trips: number; songs: number };

const ITEMS = [
  { key: "children", icon: Smile, color: "#E30613" },
  { key: "activities", icon: Palette, color: "#2BB673" },
  { key: "events", icon: CalendarDays, color: "#FF6B4A" },
  { key: "trips", icon: Tent, color: "#1E9BD7" },
  { key: "monitors", icon: UserRoundCheck, color: "#7C4DFF" },
  { key: "songs", icon: Music, color: "#FFB400" },
] as const;

/** Aggregated numbers from the DB — never personal data. */
export function StatsBand({ stats, className }: { stats: Stats; className?: string }) {
  const t = useTranslations("public.stats");
  const locale = useLocale();
  const nf = new Intl.NumberFormat(intlLocale(locale));
  return (
    <section aria-labelledby="stats-title" className={className ?? "mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8"}>
      <h2 id="stats-title" className="mb-6 text-center text-2xl font-extrabold text-ink sm:text-3xl">
        {t("title")}
      </h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {ITEMS.map(({ key, icon: Icon, color }) => (
          <div key={key} className="relative flex flex-col items-center overflow-hidden rounded-3xl border border-line bg-surface p-5 text-center shadow-[var(--shadow-soft)]">
            <span className="absolute -end-6 -top-6 size-20 rounded-full opacity-15" style={{ background: color }} aria-hidden />
            <Icon className="mx-auto size-6" style={{ color }} aria-hidden />
            <dt className="order-last mt-1.5 text-sm font-bold text-ink-2">{t(key)}</dt>
            <dd className="mt-2 font-display text-4xl leading-none font-extrabold" style={{ color }} dir="ltr">
              {nf.format(stats[key])}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

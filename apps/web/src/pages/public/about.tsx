import { useTranslations } from "use-intl";
import type { publicAbout } from "@api/modules/public/routes";
import type { Loaded } from "@/lib/types";
import { useApi } from "@/lib/query";
import { usePageTitle } from "@/lib/title";
import { Link } from "@/lib/router";
import { PublicQueryView } from "@/components/public/states";
import { CalendarClock, HeartHandshake, MapPin, Scale, ShieldCheck, Sparkles, Target, Users } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { PageHero, SectionHeading } from "@/components/public/page-hero";
import { StatsBand } from "@/components/public/stats-band";
import { CtaBand } from "@/components/public/cta-band";
import { ageLabel } from "@/components/public/cards";
import { Squiggle, Star } from "@/components/public/shapes";

const VALUES = [
  { key: "safety", icon: ShieldCheck, color: "#2BB673" },
  { key: "rights", icon: Scale, color: "#E30613" },
  { key: "inclusion", icon: HeartHandshake, color: "#1E9BD7" },
  { key: "joy", icon: Sparkles, color: "#FFB400" },
] as const;

type Data = Loaded<typeof publicAbout>;

export function Component() {
  const tm = useTranslations("public.meta.about");
  usePageTitle(tm("title"));
  const query = useApi<Data>("/public/about");
  return <PublicQueryView query={query}>{(data) => <AboutPage data={data} />}</PublicQueryView>;
}

function AboutPage({ data: { org, groups, stats } }: { data: Data }) {
  const t = useTranslations("public.about");
  const tn = useTranslations("public.nav");
  const th = useTranslations("public.home.cta");
  const tp = useTranslations("public.common");
  const year = org.foundedYear ?? 1985;
  const years = new Date().getFullYear() - year;

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("lead")} color="#E30613" icon={<Users />} crumbs={[{ href: "/", label: tn("home") }]} />

      {/* Mission + history */}
      <section className="mx-auto grid max-w-7xl gap-6 px-4 pt-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-7 shadow-[var(--shadow-soft)] sm:p-10">
          <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <Target className="size-7" />
          </span>
          <h2 className="mt-5 text-3xl font-extrabold text-ink">{t("missionTitle")}</h2>
          <p className="mt-3 font-display text-xl leading-relaxed text-ink-2">{t("mission")}</p>
          <Squiggle className="absolute end-6 bottom-6 w-24 text-brand-100" />
        </div>
        <div className="relative overflow-hidden rounded-3xl bg-ink p-7 text-white shadow-[var(--shadow-lift)] sm:p-10">
          <div className="bg-confetti absolute inset-0 opacity-30" aria-hidden />
          <div className="relative flex items-start gap-5">
            <div className="shrink-0 text-center">
              <p className="font-display text-6xl leading-none font-extrabold text-sun" dir="ltr">
                {years}
              </p>
              <p className="mt-1 text-xs font-extrabold tracking-wider text-white/70 uppercase">{t("yearsLabel")}</p>
            </div>
            <div>
              <h2 className="text-3xl font-extrabold">{t("historyTitle")}</h2>
              <p className="mt-3 leading-relaxed text-white/80">{t("history", { year })}</p>
            </div>
          </div>
          <Star className="absolute end-8 top-8 size-6 text-sun" />
        </div>
      </section>

      {/* Values */}
      <section aria-labelledby="values-title" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
        <SectionHeading id="values-title" title={t("valuesTitle")} color="#FFB400" />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map(({ key, icon: Icon, color }) => (
            <li key={key} className="rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-soft)]">
              <span className="grid size-12 place-items-center rounded-2xl text-white" style={{ background: color }}>
                <Icon className="size-6" />
              </span>
              <h3 className="mt-4 text-xl font-extrabold text-ink">{t(`values.${key}.title`)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{t(`values.${key}.text`)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Groups */}
      {groups.length > 0 && (
        <section aria-labelledby="groups-title" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
          <SectionHeading id="groups-title" title={t("groupsTitle")} subtitle={t("groupsSubtitle")} color="#1E9BD7" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <li key={g.id} className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-soft)]">
                <span className="absolute inset-y-0 start-0 w-2" style={{ background: g.color }} aria-hidden />
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl font-extrabold text-ink">{g.name}</h3>
                  <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold text-white" style={{ background: g.color }}>
                    {ageLabel(tp, g.ageMin, g.ageMax)}
                  </span>
                </div>
                {g.description && <p dir="auto" className="mt-2 text-sm text-muted">{g.description}</p>}
                <ul className="mt-4 space-y-1.5 text-sm text-ink-2">
                  {g.schedule && (
                    <li className="flex items-center gap-2">
                      <CalendarClock className="size-4 shrink-0 text-muted" aria-hidden />
                      <span className="sr-only">{t("schedule")}:</span> {g.schedule}
                    </li>
                  )}
                  {g.location && (
                    <li className="flex items-center gap-2">
                      <MapPin className="size-4 shrink-0 text-muted" aria-hidden /> {g.location}
                    </li>
                  )}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      <StatsBand stats={stats} />

      <CtaBand
        title={th("title")}
        text={th("text")}
        actions={
          <>
            <Link href="/join" className={buttonClasses("sun", "lg", "h-14 rounded-full px-7 text-lg")}>
              <Sparkles className="size-5" /> {th("join")}
            </Link>
            <Link href="/activities" className={buttonClasses("outline", "lg", "h-14 rounded-full border-white/40 bg-white/10 px-7 text-lg text-white hover:bg-white/20")}>
              {tn("activities")}
            </Link>
          </>
        }
      />
    </>
  );
}

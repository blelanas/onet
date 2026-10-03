import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BookOpen, HeartHandshake, MessageCircle, Palette, Sparkles, Trophy } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getHomeData, getOrgProfile } from "@/server/public/queries";
import { HomeHero } from "@/components/public/home-hero";
import { SectionHeading } from "@/components/public/page-hero";
import { ActivityCard, EventCard, NewsCard, TripCard } from "@/components/public/cards";
import { SongBrowser } from "@/components/public/song-browser";
import { GalleryGrid } from "@/components/public/gallery-grid";
import { StatsBand } from "@/components/public/stats-band";
import { CtaBand } from "@/components/public/cta-band";
import { Squiggle } from "@/components/public/shapes";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("public.meta.home");
  return { title: { absolute: t("title") }, description: t("description"), openGraph: { title: t("title"), description: t("description"), type: "website" } };
}

const PILLARS = [
  { key: "learn", icon: BookOpen, color: "#2BB673", soft: "var(--leaf-soft)" },
  { key: "play", icon: Trophy, color: "#FFB400", soft: "var(--sun-soft)" },
  { key: "create", icon: Palette, color: "#7C4DFF", soft: "var(--grape-soft)" },
  { key: "belong", icon: HeartHandshake, color: "#1E9BD7", soft: "var(--sky-soft)" },
] as const;

export default async function HomePage() {
  const [data, org, t, tp, tc] = await Promise.all([getHomeData(), getOrgProfile(), getTranslations("public.home"), getTranslations("public.pillars"), getTranslations("public.common")]);

  return (
    <>
      <HomeHero kids={data.stats.children} foundedYear={org.foundedYear} />

      {/* Pillars */}
      <section aria-labelledby="pillars-title" className="relative mx-auto -mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="pillars-title" className="sr-only">
          {tp("title")}
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {PILLARS.map(({ key, icon: Icon, color, soft }, i) => (
            <li key={key} className="animate-[var(--animate-fade-up)] rounded-3xl border border-line bg-surface p-4 shadow-[var(--shadow-soft)] sm:p-6" style={{ animationDelay: `${i * 80}ms` }}>
              <span className="grid size-12 place-items-center rounded-2xl sm:size-14" style={{ background: soft, color }}>
                <Icon className="size-6 sm:size-7" />
              </span>
              <h3 className="mt-3 text-xl font-extrabold text-ink sm:text-2xl">{tp(`${key}.title`)}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{tp(`${key}.text`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <StatsBand stats={data.stats} />

      {/* Upcoming events */}
      <section aria-labelledby="events-title" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <SectionHeading id="events-title" title={t("events.title")} subtitle={t("events.subtitle")} href="/events" linkLabel={tc("seeAll")} color="#FF6B4A" />
        {data.events.length ? (
          <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {data.events.map((e) => (
              <div key={e.id} className="flex w-[82%] shrink-0 snap-start sm:w-auto [&>article]:flex-1">
                <EventCard event={e} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState compact title={tc("emptyTitle")} description={tc("emptyUpcomingEvents")} />
          </div>
        )}
      </section>

      {/* Upcoming trips */}
      <section aria-labelledby="trips-title" className="relative mt-16 overflow-hidden bg-sky-soft/70 py-16 sm:mt-20 sm:py-20">
        <Squiggle className="absolute end-6 top-8 w-32 text-sky/30" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading id="trips-title" title={t("trips.title")} subtitle={t("trips.subtitle")} href="/trips" linkLabel={tc("seeAll")} color="#1E9BD7" />
          {data.trips.length ? (
            <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
              {data.trips.map((tr) => (
                <div key={tr.id} className="flex w-[82%] shrink-0 snap-start sm:w-auto [&>article]:flex-1">
                  <TripCard trip={tr} />
                </div>
              ))}
            </div>
          ) : (
            <div className="card">
              <EmptyState compact title={tc("emptyTitle")} description={tc("emptyUpcomingTrips")} />
            </div>
          )}
        </div>
      </section>

      {/* Activities */}
      {data.activities.length > 0 && (
        <section aria-labelledby="activities-title" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
          <SectionHeading id="activities-title" title={t("activities.title")} subtitle={t("activities.subtitle")} href="/activities" linkLabel={tc("seeAll")} color="#2BB673" />
          <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {data.activities.map((a) => (
              <div key={a.id} className="flex w-[78%] shrink-0 snap-start sm:w-auto [&>article]:flex-1">
                <ActivityCard activity={a} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Songs */}
      {data.songs.length > 0 && (
        <section aria-labelledby="songs-title" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] bg-ink px-5 py-10 sm:px-10 sm:py-14">
            <div className="bg-confetti absolute inset-0 opacity-30" aria-hidden />
            <div className="absolute -end-20 -top-20 size-72 rounded-full bg-grape/40 blur-3xl" aria-hidden />
            <div className="absolute -start-16 -bottom-24 size-72 rounded-full bg-brand-600/40 blur-3xl" aria-hidden />
            <div className="relative">
              <SectionHeading id="songs-title" light title={t("songs.title")} subtitle={t("songs.subtitle")} href="/songs" linkLabel={t("songs.allSongs")} color="#E8457C" />
              <SongBrowser songs={data.songs} dark lyricsOpen={false} />
            </div>
          </div>
        </section>
      )}

      {/* News */}
      {data.news.length > 0 && (
        <section aria-labelledby="news-title" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
          <SectionHeading id="news-title" title={t("news.title")} subtitle={t("news.subtitle")} href="/news" linkLabel={tc("seeAll")} color="#7C4DFF" />
          <div className="grid gap-4 md:grid-cols-3">
            {data.news.map((n) => (
              <NewsCard key={n.id} post={n} />
            ))}
          </div>
        </section>
      )}

      {/* Gallery */}
      {data.gallery.length > 0 && (
        <section aria-labelledby="gallery-title" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
          <SectionHeading id="gallery-title" title={t("gallery.title")} subtitle={t("gallery.subtitle")} href="/gallery" linkLabel={tc("seeAll")} color="#FFB400" />
          <GalleryGrid items={data.gallery} variant="mosaic" />
        </section>
      )}

      <CtaBand
        title={t("cta.title")}
        text={t("cta.text")}
        actions={
          <>
            <Link href="/join" className={buttonClasses("sun", "lg", "h-14 rounded-full px-7 text-lg")}>
              <Sparkles className="size-5" /> {t("cta.join")}
            </Link>
            <Link href="/contact" className={buttonClasses("outline", "lg", "h-14 rounded-full border-white/40 bg-white/10 px-7 text-lg text-white hover:bg-white/20")}>
              <MessageCircle className="size-5" /> {t("cta.contact")}
            </Link>
          </>
        }
      />
    </>
  );
}

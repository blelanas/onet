import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarDays, Clock, MapPin, Megaphone } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getPublicEvent } from "@/server/public/queries";
import { categoryColor } from "@/components/public/category";
import { DetailHero, Fact, Prose, RegisterPanel } from "@/components/public/detail-parts";
import { EventCard } from "@/components/public/cards";
import { GalleryGrid } from "@/components/public/gallery-grid";
import { SectionHeading } from "@/components/public/page-hero";
import { longDate, paragraphs, timeRange } from "@/components/public/format";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getPublicEvent(id);
  if (!data) return {};
  const desc = data.event.description?.slice(0, 160);
  return { title: data.event.title, description: desc, openGraph: { title: data.event.title, description: desc, type: "article" } };
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const [data, user, locale, t, td, tn, tc] = await Promise.all([
    getPublicEvent(id),
    getCurrentUser(),
    getLocale(),
    getTranslations("public.reg"),
    getTranslations("public.details"),
    getTranslations("public.nav"),
    getTranslations("common"),
  ]);
  if (!data) notFound();
  const { event, photos, related } = data;
  const color = categoryColor(event.category);
  const now = new Date();
  const past = event.status === "COMPLETED" || event.endAt < now;
  const deadlinePassed = !!event.registrationDeadline && event.registrationDeadline < now;
  const open = !past && event.status === "PUBLISHED" && event.startAt > now && !deadlinePassed && event.left > 0;
  const closedText = past ? t("pastText") : event.left === 0 ? t("fullText") : t("closedEvent");

  return (
    <>
      <DetailHero
        seed={event.id}
        src={event.coverUrl}
        color={color}
        category={event.category}
        categoryLabel={tc(`enums.eventCategory.${event.category}`)}
        title={event.title}
        crumbs={[
          { href: "/", label: tn("home") },
          { href: "/events", label: tn("events") },
        ]}
      >
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-bold text-white/90 sm:text-base">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden />
            <time dateTime={event.startAt.toISOString()}>{longDate(event.startAt, locale)}</time>
          </span>
          {event.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden /> {event.location}
            </span>
          )}
        </p>
      </DetailHero>

      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-8 px-4 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <div className="order-2 space-y-10 lg:order-1">
          <section aria-labelledby="about-title">
            <h2 id="about-title" className="mb-4 text-2xl font-extrabold text-ink">
              {td("about")}
            </h2>
            <Prose paragraphs={paragraphs(event.description)} />
          </section>
          {photos.length > 0 && (
            <section aria-labelledby="photos-title">
              <h2 id="photos-title" className="mb-4 text-2xl font-extrabold text-ink">
                {td("photos")}
              </h2>
              <GalleryGrid items={photos} />
            </section>
          )}
        </div>
        <div className="order-1 lg:order-2">
          <RegisterPanel
            kind="events"
            id={event.id}
            loggedIn={!!user}
            open={open}
            closedText={closedText}
            left={event.left}
            capacity={event.capacity}
            price={event.price}
            deadline={event.registrationDeadline}
            color={color}
          >
            <Fact icon={<CalendarDays />} label={td("when")} color={color}>
              {longDate(event.startAt, locale)}
            </Fact>
            <Fact icon={<Clock />} label={tc("fields.time")} color={color}>
              <span dir="ltr">{timeRange(event.startAt, event.endAt, locale)}</span>
            </Fact>
            {event.location && (
              <Fact icon={<MapPin />} label={td("where")} color={color}>
                {event.location}
              </Fact>
            )}
            {event.organizer && (
              <Fact icon={<Megaphone />} label={td("organizer")} color={color}>
                {event.organizer}
              </Fact>
            )}
          </RegisterPanel>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
          <SectionHeading id="related-title" title={td("otherEvents")} href="/events" linkLabel={td("allEvents")} color={color} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

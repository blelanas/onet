import { useLocale, useTranslations } from "use-intl";
import { CalendarDays, CalendarCheck, FileCheck2, MapPin, Navigation, Users } from "lucide-react";
import type { publicTrip } from "@api/modules/public/routes";
import type { Loaded } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/query";
import { useParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import { PublicQueryView } from "@/components/public/states";
import { categoryColor } from "@/components/public/category";
import { DetailHero, Fact, Prose, RegisterPanel } from "@/components/public/detail-parts";
import { TripCard, ageLabel } from "@/components/public/cards";
import { GalleryGrid } from "@/components/public/gallery-grid";
import { SectionHeading } from "@/components/public/page-hero";
import { clock, dateRange, daysBetween, longDate, paragraphs } from "@/components/public/format";

function parseProgram(program?: string | null) {
  return (program ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [a, ...rest] = l.split("|");
      return rest.length ? { when: a.trim(), what: rest.join("|").trim() } : { when: "", what: a.trim() };
    });
}

type Data = Loaded<typeof publicTrip>;

export function Component() {
  const { id } = useParams();
  const query = useApi<Data>(`/public/trips/${encodeURIComponent(id ?? "")}`);
  usePageTitle(query.data?.trip.title);
  return <PublicQueryView query={query}>{(data) => <TripDetailPage data={data} />}</PublicQueryView>;
}

function TripDetailPage({ data }: { data: Data }) {
  const { me: user } = useAuth();
  const locale = useLocale();
  const t = useTranslations("public.reg");
  const td = useTranslations("public.details");
  const tn = useTranslations("public.nav");
  const tc = useTranslations("common");
  const tp = useTranslations("public.common");
  const { trip, photos, related } = data;
  const color = categoryColor(trip.category);
  const now = new Date();
  const past = trip.status === "COMPLETED" || trip.returnAt < now;
  const deadlinePassed = !!trip.registrationDeadline && trip.registrationDeadline < now;
  const left = trip.status === "FULL" ? 0 : trip.left;
  const open = !past && trip.status === "OPEN" && trip.departAt > now && !deadlinePassed && left > 0;
  const closedText = trip.status === "CANCELLED" ? t("cancelledTrip") : past ? t("pastTripText") : left === 0 ? t("fullText") : t("closedTrip");
  const program = parseProgram(trip.program);
  const docs = (trip.requiredDocuments ?? "")
    .split("\n")
    .map((d) => d.trim())
    .filter(Boolean);
  const days = daysBetween(trip.departAt, trip.returnAt);

  return (
    <>
      <DetailHero
        seed={trip.id}
        src={trip.coverUrl}
        color={color}
        category={trip.category}
        categoryLabel={tc(`enums.tripCategory.${trip.category}`)}
        title={trip.title}
        crumbs={[
          { href: "/", label: tn("home") },
          { href: "/trips", label: tn("trips") },
        ]}
      >
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-bold text-white/90 sm:text-base">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4" aria-hidden /> {trip.destination}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden /> {dateRange(trip.departAt, trip.returnAt, locale)} · {td("days", { count: days })}
          </span>
        </p>
      </DetailHero>

      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-8 px-4 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <div className="order-2 space-y-10 lg:order-1">
          <section aria-labelledby="about-title">
            <h2 id="about-title" className="mb-4 text-2xl font-extrabold text-ink">
              {td("about")}
            </h2>
            <Prose paragraphs={paragraphs(trip.description)} />
          </section>

          {program.length > 0 && (
            <section aria-labelledby="program-title">
              <h2 id="program-title" className="mb-5 text-2xl font-extrabold text-ink">
                {td("program")}
              </h2>
              <ol className="relative space-y-3 border-s-[3px] border-dashed ps-6" style={{ borderColor: `${color}55` }}>
                {program.map((step, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -start-[34px] top-3 grid size-5 place-items-center rounded-full ring-4 ring-canvas" style={{ background: color }} aria-hidden />
                    <div className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:gap-4">
                      {step.when && (
                        <span className="w-fit shrink-0 rounded-full px-3 py-1 text-sm font-extrabold tabular-nums" style={{ background: `${color}1A`, color }}>
                          {step.when}
                        </span>
                      )}
                      <span className="font-bold text-ink">{step.what}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {docs.length > 0 && (
            <section aria-labelledby="docs-title">
              <h2 id="docs-title" className="mb-4 text-2xl font-extrabold text-ink">
                {td("documents")}
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {docs.map((d) => (
                  <li key={d} className="flex items-center gap-3 rounded-2xl bg-sun-soft/70 p-3.5 font-bold text-ink">
                    <FileCheck2 className="size-5 shrink-0 text-amber-600" aria-hidden />
                    {d}
                  </li>
                ))}
              </ul>
            </section>
          )}

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
            kind="trips"
            id={trip.id}
            loggedIn={!!user}
            open={open}
            closedText={closedText}
            left={left}
            capacity={trip.capacity}
            price={trip.price}
            deadline={trip.registrationDeadline}
            color={color}
          >
            <Fact icon={<CalendarDays />} label={td("departure")} color={color}>
              {longDate(trip.departAt, locale)} · <span dir="ltr">{clock(trip.departAt, locale)}</span>
            </Fact>
            <Fact icon={<CalendarCheck />} label={td("return")} color={color}>
              {longDate(trip.returnAt, locale)} · <span dir="ltr">{clock(trip.returnAt, locale)}</span>
            </Fact>
            <Fact icon={<Navigation />} label={td("meetingPoint")} color={color}>
              {trip.departureLocation}
            </Fact>
            <Fact icon={<Users />} label={td("ages")} color={color}>
              {ageLabel(tp, trip.ageMin, trip.ageMax)}
            </Fact>
          </RegisterPanel>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
          <SectionHeading id="related-title" title={td("otherTrips")} href="/trips" linkLabel={td("allTrips")} color={color} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <TripCard key={r.id} trip={r} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

import { useLocale, useTranslations } from "use-intl";
import { CalendarClock, ClipboardCheck, Clock, CreditCard, Download, Edit, Hourglass, MapPin, Megaphone, Smile, Ticket, Trash2, Users, Wallet } from "lucide-react";
import type { eventCheckInPage, eventPage, eventParticipantsPage } from "@api/modules/events/routes";
import { formatDate, formatMoney } from "@onet/shared";
import { download } from "@/lib/api";
import { useApi } from "@/lib/query";
import { Link, useParams, useSearchParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { ageFrom } from "@/lib/utils";
import { deleteEvent, saveEventCheckIn } from "@/api/events";
import { RequirePerm } from "@/components/states/guards";
import { QueryView } from "@/components/states/page-state";
import { Button, LinkButton } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CoverArt } from "@/components/ui/cover-art";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { Breadcrumbs } from "@/components/ui/page-header";
import { InfoList, Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { LinkTabs } from "@/components/ui/tabs";
import { AddParticipantButton } from "@/components/registrations/add-participant";
import { FamilyRegisterPanel } from "@/components/registrations/family-register-panel";
import { ParticipantsTable } from "@/components/registrations/participants-table";
import { RollCallForm } from "@/components/registrations/roll-call-form";
import { CategoryIcon, DateTile, PlacesMeter, categoryColor } from "@/components/registrations/visuals";
import { dateTime, hm } from "@/components/registrations/format";

type Data = Loaded<typeof eventPage>;

export function Component() {
  const { id } = useParams();
  const query = useApi<Data>(`/events/${id}`);
  return (
    <RequirePerm perm="events.read">
      <QueryView query={query}>{(data) => <EventDetail id={id!} data={data} />}</QueryView>
    </RequirePerm>
  );
}

function EventDetail({ id, data }: { id: string; data: Data }) {
  const t = useTranslations("events");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const tabParam = useSearchParams().get("tab");
  const { event: e, manage, staff, canCheckIn, showMoney, open } = data;
  usePageTitle(e.title);

  const color = categoryColor(e.category);
  const taken = e._count.registrations;
  const left = Math.max(0, e.capacity - taken);
  const base = `/dashboard/events/${id}`;
  const tabs = [
    { key: "overview", label: t("detail.tabs.overview"), href: base },
    ...(staff ? [{ key: "participants", label: t("detail.tabs.participants"), href: `${base}?tab=participants`, count: taken }] : []),
    ...(canCheckIn ? [{ key: "checkin", label: t("detail.tabs.checkin"), href: `${base}?tab=checkin` }] : []),
  ];
  const tab = tabs.some((x) => x.key === tabParam) ? tabParam! : "overview";

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.events"), href: "/dashboard/events" }, { label: e.title }]} />

      {/* Hero */}
      <div className="card overflow-hidden">
        <CoverArt src={e.coverUrl} seed={e.id} color={color} icon={<CategoryIcon kind="event" category={e.category} />} className="h-48 sm:h-64">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-4 sm:p-6">
            <DateTile date={e.startAt} locale={locale} className="hidden sm:flex" />
            <div className="min-w-0 flex-1 text-white">
              <div className="mb-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-extrabold" style={{ color }}>
                  {tc(`enums.eventCategory.${e.category}`)}
                </span>
                {e.status !== "PUBLISHED" && <StatusBadge status={e.status} className="bg-white/90" />}
                {!e.isPublic && <span className="rounded-full bg-black/40 px-2.5 py-0.5 text-xs font-bold">{t("card.internal")}</span>}
              </div>
              <h1 className="text-2xl leading-tight font-extrabold drop-shadow sm:text-4xl">{e.title}</h1>
              <p className="mt-1 text-sm font-semibold text-white/90 sm:text-base">
                {formatDate(e.startAt, locale, "long")} · <span dir="ltr">{hm(e.startAt, locale)}</span>
              </p>
            </div>
          </div>
        </CoverArt>
        {manage && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3">
            <LinkButton href={`${base}/edit`} variant="outline" size="sm">
              <Edit className="size-4" /> {tc("actions.edit")}
            </LinkButton>
            <ConfirmButton action={deleteEvent.bind(null, id)} variant="outline" size="sm" title={t("detail.deleteTitle")} description={t("detail.deleteText")} redirectTo="/dashboard/events" ariaLabel={tc("actions.delete")}>
              <Trash2 className="size-4 text-red-600" /> {tc("actions.delete")}
            </ConfirmButton>
          </div>
        )}
      </div>

      {tabs.length > 1 && <LinkTabs tabs={tabs} active={tab} className="mb-0" />}

      {tab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            {e.description && (
              <Section title={t("detail.about")}>
                <p className="leading-relaxed whitespace-pre-line text-ink-2">{e.description}</p>
              </Section>
            )}
            <Section title={t("detail.practical")}>
              <InfoList
                items={[
                  { icon: <CalendarClock className="size-4" />, label: t("detail.when"), value: <span>{formatDate(e.startAt, locale, "long")}</span> },
                  {
                    icon: <Clock className="size-4" />,
                    label: tc("fields.time"),
                    value: (
                      <span dir="ltr">
                        {hm(e.startAt, locale)} – {hm(e.endAt, locale)}
                      </span>
                    ),
                  },
                  { icon: <MapPin className="size-4" />, label: tc("fields.location"), value: e.location ?? "—" },
                  { icon: <Megaphone className="size-4" />, label: t("form.organizer"), value: e.organizer ?? "—" },
                  { icon: <Users className="size-4" />, label: tc("fields.capacity"), value: tc("fields.places", { count: e.capacity }) },
                  { icon: <Hourglass className="size-4" />, label: tc("fields.deadline"), value: e.registrationDeadline ? dateTime(e.registrationDeadline, locale) : t("detail.noDeadline") },
                  ...(showMoney
                    ? [
                        { icon: <Wallet className="size-4" />, label: tc("fields.price"), value: e.price > 0 ? formatMoney(e.price, locale) : tc("fields.free") },
                        ...(e.price > 0 ? [{ icon: <CreditCard className="size-4" />, label: t("detail.payment"), value: t(e.requiresPayment ? "detail.paymentRequired" : "detail.paymentOnSite") }] : []),
                      ]
                    : []),
                ]}
              />
            </Section>
            {e.activities.length > 0 && (
              <Section title={t("detail.activities")}>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {e.activities.map((a) => (
                    <li key={a.id}>
                      <Link href={`/dashboard/activities/${a.id}`} className="card-hover flex items-center gap-3 rounded-2xl border border-line p-2.5">
                        <CoverArt src={a.coverUrl} seed={a.id} color={categoryColor(a.category)} className="size-14 shrink-0 rounded-xl" />
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-ink">{a.title}</span>
                          <span className="block text-xs text-muted">{tc(`enums.activityCategory.${a.category}`)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
            <RegisterCard data={data} eventId={id} full={left === 0} />
            {e.status === "PUBLISHED" && e.endAt > new Date() && (
              <section className="card p-5">
                <PlacesMeter taken={taken} capacity={e.capacity} label={tc("fields.placesLeft", { count: left })} />
                {e.registrationDeadline && open && (
                  <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted">
                    <Hourglass className="size-3.5" /> {t("detail.deadlineOn", { date: dateTime(e.registrationDeadline, locale) })}
                  </p>
                )}
              </section>
            )}
          </aside>
        </div>
      )}

      {tab === "participants" && staff && <ParticipantsSection eventId={id} />}

      {tab === "checkin" && canCheckIn && <CheckInSection eventId={id} />}
    </div>
  );
}

function RegisterCard({ data: d, eventId, full }: { data: Data; eventId: string; full: boolean }) {
  const t = useTranslations("events");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { open, late } = d;
  const { entries, isKid } = d;
  const price = d.event.price;
  if (isKid) {
    return (
      <section className="card overflow-hidden">
        <div className="bg-sun-soft p-5 text-center">
          <Smile className="mx-auto mb-2 size-10 text-amber-600" />
          <p className="font-display text-lg font-extrabold text-ink">{t("kid.title")}</p>
          <p className="mt-1 text-sm text-ink-2">{t("kid.text")}</p>
        </div>
      </section>
    );
  }
  if (!entries.length) return null;
  const hasReg = entries.some((x) => x.registration && x.registration.status !== "CANCELLED");
  const toPanel = (x: (typeof entries)[number]) => ({ member: { ...x.member, age: ageFrom(x.member.dateOfBirth) }, registration: x.registration, reason: x.reason });
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line bg-gradient-to-br from-brand-50 to-surface px-5 py-4">
        <span className="grid size-10 place-items-center rounded-2xl bg-brand-600 text-white shadow-[var(--shadow-brand)]">
          <Ticket className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-bold text-ink">{t("panel.title")}</h2>
          <p className="text-xs text-muted">{price > 0 ? t("panel.pricePer", { price: formatMoney(price, locale) }) : tc("fields.free")}</p>
        </div>
      </div>
      <div className="p-4">
        {!open || late ? (
          <>
            {hasReg ? null : <EmptyState compact title={t(late && open ? "eligibility.deadline" : "eligibility.closed")} description={t("panel.closedHint")} />}
            {hasReg && <FamilyRegisterPanel targetId={eventId} price={price} full={full} entries={entries.filter((x) => x.registration && x.registration.status !== "CANCELLED").map(toPanel)} />}
          </>
        ) : (
          <FamilyRegisterPanel targetId={eventId} price={price} full={full} entries={entries.map(toPanel)} />
        )}
      </div>
    </section>
  );
}

function ParticipantsSection({ eventId }: { eventId: string }) {
  const t = useTranslations("events");
  const tc = useTranslations("common");
  const locale = useLocale();
  const query = useApi<Loaded<typeof eventParticipantsPage>>(`/events/${eventId}/participants`);
  return (
    <QueryView query={query} skeleton={<Skeleton className="h-64 rounded-3xl" />}>
      {({ rows, stats, addable, collected, capacity, showMoney, canManage }) => (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label={tc("status.CONFIRMED")} value={stats.confirmed} icon={<ClipboardCheck className="size-5" />} accent="leaf" />
            <KpiCard label={tc("status.PENDING")} value={stats.pending} icon={<Hourglass className="size-5" />} accent="sun" />
            <KpiCard label={tc("status.WAITLIST")} value={stats.waitlist} icon={<Users className="size-5" />} accent="grape" />
            {showMoney ? (
              <KpiCard label={t("participants.collected")} value={formatMoney(collected, locale, { compact: true })} icon={<Wallet className="size-5" />} accent="sky" />
            ) : (
              <KpiCard label={tc("fields.capacity")} value={`${stats.active}/${capacity}`} icon={<Users className="size-5" />} accent="sky" />
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-muted">{t("participants.summary", { active: stats.active, capacity })}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => void download(`/events/${eventId}/participants/export.csv`)}>
                <Download className="size-4" /> <span className="hidden sm:inline">{tc("actions.exportCsv")}</span>
              </Button>
              {canManage && <AddParticipantButton kind="event" targetId={eventId} members={addable.map((m) => ({ ...m, age: ageFrom(m.dateOfBirth) }))} />}
            </div>
          </div>
          <ParticipantsTable kind="event" rows={rows} canManage={canManage} showMoney={showMoney} />
        </div>
      )}
    </QueryView>
  );
}

function CheckInSection({ eventId }: { eventId: string }) {
  const t = useTranslations("events");
  const tc = useTranslations("common");
  const locale = useLocale();
  const query = useApi<Loaded<typeof eventCheckInPage>>(`/events/${eventId}/checkin`);
  return (
    <QueryView query={query} skeleton={<Skeleton className="h-64 rounded-3xl" />}>
      {({ day, entries }) => (
        <Section title={t("rollCall.eventTitle", { date: formatDate(day, locale, "long") })}>
          {entries.length ? (
            <RollCallForm action={saveEventCheckIn} targetId={eventId} entries={entries.map((r) => ({ ...r, note: r.pending ? tc("status.PENDING") : null }))} />
          ) : (
            <EmptyState compact title={t("participants.empty")} />
          )}
        </Section>
      )}
    </QueryView>
  );
}

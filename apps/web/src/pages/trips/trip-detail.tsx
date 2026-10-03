import { useLocale, useTranslations } from "use-intl";
import { Backpack, Baby, Bus, CalendarClock, CheckCircle2, ClipboardCheck, Download, Edit, FileCheck2, FileSignature, Hourglass, MapPin, Phone, Smile, Trash2, Users, Wallet } from "lucide-react";
import type { tripPage, tripParticipantsPage, tripRollCallPage } from "@api/modules/trips/routes";
import { formatDate, formatMoney } from "@onet/shared";
import { download } from "@/lib/api";
import { useApi } from "@/lib/query";
import { useParams, useSearchParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { ageFrom } from "@/lib/utils";
import { deleteTrip, saveTripRollCall } from "@/api/trips";
import { RequirePerm } from "@/components/states/guards";
import { QueryView } from "@/components/states/page-state";
import { Avatar } from "@/components/ui/avatar";
import { Button, LinkButton } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CoverArt } from "@/components/ui/cover-art";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { Breadcrumbs } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { InfoList, Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { LinkTabs } from "@/components/ui/tabs";
import { EntityDocuments } from "@/components/documents/entity-documents";
import { AddParticipantButton } from "@/components/registrations/add-participant";
import { ParticipantsTable } from "@/components/registrations/participants-table";
import { RollCallForm } from "@/components/registrations/roll-call-form";
import { CategoryIcon, DateTile, PlacesMeter, categoryColor } from "@/components/registrations/visuals";
import { AddMonitorForm, RemoveMonitorButton } from "@/components/trips/monitors-manager";
import { ProgramTimeline } from "@/components/trips/program-timeline";
import { tripDays } from "@/components/trips/trip-card";
import { TripFamilyFlow } from "@/components/trips/trip-family-flow";
import { dateTime, hm } from "@/components/registrations/format";

type Data = Loaded<typeof tripPage>;

export function Component() {
  const { id } = useParams();
  const query = useApi<Data>(`/trips/${id}`);
  return (
    <RequirePerm perm="trips.read">
      <QueryView query={query}>{(data) => <TripDetail id={id!} data={data} />}</QueryView>
    </RequirePerm>
  );
}

function TripDetail({ id, data }: { id: string; data: Data }) {
  const t = useTranslations("trips");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const sp = useSearchParams();
  const tabParam = sp.get("tab");
  const child = sp.get("child") ?? undefined;
  const { trip, manage, monitor, staff, canRollCall, showMoney, isKid, open, late, entries, steps, docs, showShared, monitorChoices } = data;
  usePageTitle(trip.title);

  const color = categoryColor(trip.category);
  const taken = trip._count.registrations;
  const left = Math.max(0, trip.capacity - taken);
  const days = tripDays(trip.departAt, trip.returnAt);
  const base = `/dashboard/trips/${id}`;
  const openForFamilies = open && !late;
  const showFlow = entries.length > 0 && (openForFamilies || entries.some((e) => e.registration && e.registration.status !== "CANCELLED"));

  const tabs = [
    { key: "overview", label: t("detail.tabs.overview"), href: base },
    ...(staff ? [{ key: "participants", label: t("detail.tabs.participants"), href: `${base}?tab=participants`, count: taken }] : []),
    ...(canRollCall ? [{ key: "rollcall", label: t("detail.tabs.rollcall"), href: `${base}?tab=rollcall` }] : []),
  ];
  const tab = tabs.some((x) => x.key === tabParam) ? tabParam! : "overview";

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.trips"), href: "/dashboard/trips" }, { label: trip.title }]} />

      <div className="card overflow-hidden">
        <CoverArt src={trip.coverUrl} seed={trip.id} color={color} icon={<CategoryIcon kind="trip" category={trip.category} />} className="h-52 sm:h-72">
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-4 sm:p-6">
            <DateTile date={trip.departAt} locale={locale} className="hidden sm:flex" />
            <div className="min-w-0 flex-1 text-white">
              <div className="mb-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-extrabold" style={{ color }}>
                  {tc(`enums.tripCategory.${trip.category}`)}
                </span>
                <StatusBadge status={trip.status} className="bg-white/90" />
                {monitor && <span className="rounded-full bg-sky px-2.5 py-0.5 text-xs font-bold">{t("detail.youSupervise")}</span>}
              </div>
              <h1 className="text-2xl leading-tight font-extrabold drop-shadow sm:text-4xl">{trip.title}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-white/90 sm:text-base">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" /> {trip.destination}
                </span>
                <span>{days > 1 ? `${formatDate(trip.departAt, locale)} → ${formatDate(trip.returnAt, locale)}` : formatDate(trip.departAt, locale, "long")}</span>
              </p>
            </div>
          </div>
        </CoverArt>
        {manage && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3">
            <LinkButton href={`${base}/edit`} variant="outline" size="sm">
              <Edit className="size-4" /> {tc("actions.edit")}
            </LinkButton>
            <ConfirmButton action={deleteTrip.bind(null, id)} variant="outline" size="sm" title={t("detail.deleteTitle")} description={t("detail.deleteText")} redirectTo="/dashboard/trips" ariaLabel={tc("actions.delete")}>
              <Trash2 className="size-4 text-red-600" /> {tc("actions.delete")}
            </ConfirmButton>
          </div>
        )}
      </div>

      {tabs.length > 1 && <LinkTabs tabs={tabs} active={tab} className="mb-0" />}

      {tab === "overview" && (
        <>
          {showFlow && <TripFamilyFlow trip={trip} entries={entries} selectedId={child} basePath={base} docs={docs} full={left === 0} />}
          {!showFlow && entries.length > 0 && !openForFamilies && (
            <div className="card flex items-center gap-3 p-4 text-sm font-semibold text-ink-2">
              <Hourglass className="size-5 text-muted" /> {t(late && open ? "eligibility.deadline" : "eligibility.closed")}
            </div>
          )}
          {isKid && (
            <div className="card flex items-center gap-4 bg-sun-soft p-5">
              <Smile className="size-10 shrink-0 text-amber-600" />
              <div>
                <p className="font-display text-lg font-extrabold text-ink">{t("kid.title")}</p>
                <p className="text-sm text-ink-2">{t("kid.text")}</p>
              </div>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              {trip.description && (
                <Section title={t("detail.about")}>
                  <p className="leading-relaxed whitespace-pre-line text-ink-2">{trip.description}</p>
                </Section>
              )}
              <div id="program" className="scroll-mt-24">
                <Section title={t("detail.program")}>{steps.length ? <ProgramTimeline steps={steps} /> : <p className="text-sm text-muted">{t("detail.noProgram")}</p>}</Section>
              </div>
              <div id="documents" className="scroll-mt-24">
                <Section title={t("detail.documents")}>
                  {docs.length ? (
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {docs.map((d) => (
                        <li key={d} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                            <FileCheck2 className="size-4" />
                          </span>
                          <span className="text-sm font-bold text-ink">{d}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted">{t("flow.noDocs")}</p>
                  )}
                  {showShared && (
                    <div className="mt-5 border-t border-line pt-4">
                      <p className="mb-3 text-xs font-extrabold tracking-wide text-muted uppercase">{t("detail.sharedFiles")}</p>
                      <EntityDocuments entityType="TRIP" entityId={id} />
                    </div>
                  )}
                </Section>
              </div>
            </div>

            <aside className="space-y-5">
              <div id="meeting" className="scroll-mt-24">
                <Section title={t("detail.practical")}>
                  <InfoList
                    items={[
                      { icon: <MapPin className="size-4" />, label: t("form.departureLocation"), value: trip.departureLocation },
                      { icon: <Bus className="size-4" />, label: t("detail.departure"), value: dateTime(trip.departAt, locale) },
                      { icon: <CalendarClock className="size-4" />, label: t("detail.return"), value: days > 1 ? dateTime(trip.returnAt, locale) : <span dir="ltr">{hm(trip.returnAt, locale)}</span> },
                      { icon: <Backpack className="size-4" />, label: t("detail.duration"), value: t("card.days", { count: days }) },
                      ...(trip.ageMin != null || trip.ageMax != null ? [{ icon: <Baby className="size-4" />, label: tc("fields.ageRange"), value: t("card.ages", { min: trip.ageMin ?? 0, max: trip.ageMax ?? 99 }) }] : []),
                      ...(showMoney ? [{ icon: <Wallet className="size-4" />, label: tc("fields.price"), value: trip.price > 0 ? formatMoney(trip.price, locale) : tc("fields.free") }] : []),
                      { icon: <Hourglass className="size-4" />, label: tc("fields.deadline"), value: trip.registrationDeadline ? dateTime(trip.registrationDeadline, locale) : "—" },
                    ]}
                  />
                  {trip.returnAt > new Date() && ["OPEN", "FULL"].includes(trip.status) && <PlacesMeter className="mt-4" taken={taken} capacity={trip.capacity} label={tc("fields.placesLeft", { count: left })} />}
                </Section>
              </div>
              <div id="monitors" className="scroll-mt-24">
                <Section title={t("detail.monitors")}>
                  {trip.monitors.length ? (
                    <ul className="space-y-2">
                      {trip.monitors.map((m) => (
                        <li key={m.memberId} className="flex items-center gap-3 rounded-2xl border border-line p-2.5">
                          <Avatar firstName={m.member.firstName} lastName={m.member.lastName} src={m.member.photoUrl} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold text-ink">
                              {m.member.firstName} {m.member.lastName}
                            </p>
                            {/* The API only sends phone numbers to staff and families with a confirmed child. */}
                            {m.member.phone && (
                              <a href={`tel:${m.member.phone}`} className="flex items-center gap-1 text-xs font-semibold text-brand-700" dir="ltr">
                                <Phone className="size-3" /> {m.member.phone}
                              </a>
                            )}
                          </div>
                          {manage && <RemoveMonitorButton tripId={id} memberId={m.memberId} name={`${m.member.firstName} ${m.member.lastName}`} />}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted">{t("detail.noMonitors")}</p>
                  )}
                  {manage && <AddMonitorForm tripId={id} options={monitorChoices} />}
                </Section>
              </div>
            </aside>
          </div>
        </>
      )}

      {tab === "participants" && staff && <ParticipantsSection id={id} />}
      {tab === "rollcall" && canRollCall && <RollCallSection id={id} />}
    </div>
  );
}

function ParticipantsSection({ id }: { id: string }) {
  const t = useTranslations("trips");
  const tc = useTranslations("common");
  const locale = useLocale();
  const query = useApi<Loaded<typeof tripParticipantsPage>>(`/trips/${id}/participants`);
  return (
    <QueryView query={query} skeleton={<Skeleton className="h-64 rounded-3xl" />}>
      {({ rows, stats, addable, capacity, consent, docsOk, activeCount, expected, collected, showMoney, regManage }) => (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label={tc("status.CONFIRMED")} value={stats.confirmed} icon={<ClipboardCheck className="size-5" />} accent="leaf" />
            <KpiCard label={tc("status.PENDING")} value={stats.pending} icon={<Hourglass className="size-5" />} accent="sun" />
            <KpiCard label={tc("status.WAITLIST")} value={stats.waitlist} icon={<Users className="size-5" />} accent="grape" />
            <KpiCard label={t("participants.placesLeft")} value={Math.max(0, capacity - stats.active)} icon={<Bus className="size-5" />} accent="sky" hint={`${stats.active}/${capacity}`} />
          </div>
          <section className="card grid gap-5 p-5 sm:grid-cols-3">
            <Meter icon={<FileSignature className="size-4" />} label={t("participants.consentOverview")} value={consent} total={activeCount} color="#2BB673" />
            <Meter icon={<FileCheck2 className="size-4" />} label={t("participants.docsOverview")} value={docsOk} total={activeCount} color="#1E9BD7" />
            {showMoney ? (
              <div>
                <p className="mb-1 flex items-center justify-between gap-2 text-sm font-bold text-ink-2">
                  <span className="flex items-center gap-2">
                    <Wallet className="size-4" /> {t("participants.paymentsOverview")}
                  </span>
                  <span className="text-xs text-muted tabular-nums">{expected ? Math.round((collected / expected) * 100) : 0}%</span>
                </p>
                <Progress value={collected} max={expected || 1} color="#FFB400" />
                <p className="mt-1.5 text-xs text-muted tabular-nums">
                  {formatMoney(collected, locale)} / {formatMoney(expected, locale)}
                </p>
              </div>
            ) : (
              <Meter icon={<CheckCircle2 className="size-4" />} label={tc("fields.capacity")} value={stats.active} total={capacity} color="#7C4DFF" />
            )}
          </section>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" onClick={() => void download(`/trips/${id}/participants/export.csv`)}>
              <Download className="size-4" /> <span className="hidden sm:inline">{tc("actions.exportCsv")}</span>
            </Button>
            {regManage && <AddParticipantButton kind="trip" targetId={id} members={addable.map((m) => ({ ...m, age: ageFrom(m.dateOfBirth) }))} />}
          </div>
          <ParticipantsTable kind="trip" rows={rows} canManage={regManage} canFollowUp showMoney={showMoney} />
        </div>
      )}
    </QueryView>
  );
}

function RollCallSection({ id }: { id: string }) {
  const t = useTranslations("trips");
  const tc = useTranslations("common");
  const locale = useLocale();
  const query = useApi<Loaded<typeof tripRollCallPage>>(`/trips/${id}/rollcall`);
  return (
    <QueryView query={query} skeleton={<Skeleton className="h-64 rounded-3xl" />}>
      {({ departAt, entries }) => (
        <Section title={t("rollCall.title", { date: dateTime(departAt, locale) })}>
          {entries.length ? (
            <RollCallForm
              action={saveTripRollCall}
              targetId={id}
              entries={entries.map((r) => ({
                memberId: r.memberId,
                firstName: r.firstName,
                lastName: r.lastName,
                photoUrl: r.photoUrl,
                status: r.status,
                note: [!r.parentConsent && t("rollCall.noConsent"), r.documentsStatus !== "COMPLETE" && `${t("participants.docs")} : ${tc(`status.${r.documentsStatus}`)}`, r.medicalNotes].filter(Boolean).join(" · ") || null,
              }))}
            />
          ) : (
            <EmptyState compact title={t("participants.empty")} />
          )}
        </Section>
      )}
    </QueryView>
  );
}

function Meter({ icon, label, value, total, color }: { icon: React.ReactNode; label: string; value: number; total: number; color: string }) {
  return (
    <div>
      <p className="mb-1 flex items-center justify-between gap-2 text-sm font-bold text-ink-2">
        <span className="flex items-center gap-2">
          {icon} {label}
        </span>
        <span className="text-xs text-muted tabular-nums" dir="ltr">
          {value}/{total}
        </span>
      </p>
      <Progress value={value} max={total || 1} color={color} />
    </div>
  );
}

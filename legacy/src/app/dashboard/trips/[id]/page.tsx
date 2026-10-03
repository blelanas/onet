import { getLocale, getTranslations } from "next-intl/server";
import { Backpack, Baby, Bus, CalendarClock, CheckCircle2, ClipboardCheck, Download, Edit, FileCheck2, FileSignature, Hourglass, MapPin, Phone, Smile, Trash2, Users, Wallet } from "lucide-react";
import { can, pageQuery, requirePagePermission } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { ageFrom } from "@/lib/utils";
import { getTrip, isTripMonitor, monitorOptions, parseLines, parseProgram, tripDocumentCount } from "@/server/trips/queries";
import { deleteTrip, saveTripRollCall } from "@/server/trips/actions";
import { addableMembers, canSeeMoney, familyEntries, registrationStats, rollCall, tripParticipants } from "@/server/registrations/queries";
import { deadlinePassed, isOpen, loadTarget } from "@/server/registrations/service";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses, LinkButton } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CoverArt } from "@/components/ui/cover-art";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { Breadcrumbs } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { InfoList, Section } from "@/components/ui/section";
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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await import("@/lib/db");
  const trip = await db.trip.findUnique({ where: { id }, select: { title: true } });
  return { title: trip?.title };
}

export default async function TripPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; child?: string }> }) {
  const user = await requirePagePermission("trips.read");
  const { id } = await params;
  const { tab: tabParam, child } = await searchParams;
  const trip = await pageQuery(getTrip(user, id));
  const t = await getTranslations("trips");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const locale = await getLocale();

  const manage = can(user, "trips.manage");
  const regManage = can(user, "registrations.manage");
  const monitor = isTripMonitor(user, trip);
  const staff = regManage || manage || monitor;
  const canRollCall = manage || (monitor && can(user, "attendance.manage"));
  const showMoney = canSeeMoney(user);
  const color = categoryColor(trip.category);
  const target = await loadTarget("trip", id);
  const taken = trip._count.registrations;
  const left = Math.max(0, trip.capacity - taken);
  const days = tripDays(trip.departAt, trip.returnAt);
  const steps = parseProgram(trip.program);
  const docs = parseLines(trip.requiredDocuments);
  const base = `/dashboard/trips/${id}`;
  const entries = await familyEntries(user, target);
  const openForFamilies = isOpen(target) && !deadlinePassed(target);
  const showFlow = entries.length > 0 && (openForFamilies || entries.some((e) => e.registration && e.registration.status !== "CANCELLED"));
  const isKid = user.roles.includes("kid") && !can(user, "trips.register");
  const familyConfirmed = entries.some((e) => e.registration?.status === "CONFIRMED");
  const showShared = can(user, "documents.manage") || (await tripDocumentCount(id)) > 0;

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
              <Hourglass className="size-5 text-muted" /> {t(deadlinePassed(target) && isOpen(target) ? "eligibility.deadline" : "eligibility.closed")}
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
                      <EntityDocuments user={user} entityType="TRIP" entityId={id} revalidate={base} />
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
                            {m.member.phone && (staff || familyConfirmed) && (
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
                  {manage && <MonitorPicker tripId={id} assigned={trip.monitors.map((m) => m.memberId)} />}
                </Section>
              </div>
            </aside>
          </div>
        </>
      )}

      {tab === "participants" && staff && <ParticipantsSection />}
      {tab === "rollcall" && canRollCall && <RollCallSection />}
    </div>
  );

  async function MonitorPicker({ tripId, assigned }: { tripId: string; assigned: string[] }) {
    const options = (await monitorOptions()).filter((o) => !assigned.includes(o.id));
    return <AddMonitorForm tripId={tripId} options={options} />;
  }

  async function ParticipantsSection() {
    const [rows, stats, addable] = await Promise.all([tripParticipants(id), registrationStats("trip", id), regManage ? addableMembers("trip", id) : []]);
    const active = rows.filter((r) => r.status === "CONFIRMED" || r.status === "PENDING");
    const consent = active.filter((r) => r.parentConsent).length;
    const docsOk = active.filter((r) => r.documentsStatus === "COMPLETE").length;
    const expected = active.reduce((s, r) => s + (r.invoice && r.invoice.status !== "CANCELLED" ? r.invoice.amount : 0), 0);
    const collected = active.reduce((s, r) => s + (r.invoice?.status === "PAID" ? r.invoice.amount : 0), 0);
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label={tc("status.CONFIRMED")} value={stats.confirmed} icon={<ClipboardCheck className="size-5" />} accent="leaf" />
          <KpiCard label={tc("status.PENDING")} value={stats.pending} icon={<Hourglass className="size-5" />} accent="sun" />
          <KpiCard label={tc("status.WAITLIST")} value={stats.waitlist} icon={<Users className="size-5" />} accent="grape" />
          <KpiCard label={t("participants.placesLeft")} value={Math.max(0, trip.capacity - stats.active)} icon={<Bus className="size-5" />} accent="sky" hint={`${stats.active}/${trip.capacity}`} />
        </div>
        <section className="card grid gap-5 p-5 sm:grid-cols-3">
          <Meter icon={<FileSignature className="size-4" />} label={t("participants.consentOverview")} value={consent} total={active.length} color="#2BB673" />
          <Meter icon={<FileCheck2 className="size-4" />} label={t("participants.docsOverview")} value={docsOk} total={active.length} color="#1E9BD7" />
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
            <Meter icon={<CheckCircle2 className="size-4" />} label={tc("fields.capacity")} value={stats.active} total={trip.capacity} color="#7C4DFF" />
          )}
        </section>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <a href={`/api/trips/${id}/participants`} className={buttonClasses("outline", "md")}>
            <Download className="size-4" /> <span className="hidden sm:inline">{tc("actions.exportCsv")}</span>
          </a>
          {regManage && <AddParticipantButton kind="trip" targetId={id} members={addable.map((m) => ({ ...m, age: ageFrom(m.dateOfBirth) }))} />}
        </div>
        <ParticipantsTable kind="trip" rows={rows} canManage={regManage} canFollowUp={staff} showMoney={showMoney} />
      </div>
    );
  }

  async function RollCallSection() {
    const [rows, saved] = await Promise.all([tripParticipants(id), rollCall(`trip:${id}`, trip.departAt)]);
    const active = rows.filter((r) => r.status === "CONFIRMED" || r.status === "PENDING");
    return (
      <Section title={t("rollCall.title", { date: dateTime(trip.departAt, locale) })}>
        {active.length ? (
          <RollCallForm
            action={saveTripRollCall}
            targetId={id}
            entries={active.map((r) => ({
              memberId: r.member.id,
              firstName: r.member.firstName,
              lastName: r.member.lastName,
              photoUrl: r.member.photoUrl,
              status: saved[r.member.id],
              note: [!r.parentConsent && t("rollCall.noConsent"), r.documentsStatus !== "COMPLETE" && `${t("participants.docs")} : ${tc(`status.${r.documentsStatus}`)}`, r.member.medicalNotes].filter(Boolean).join(" · ") || null,
            }))}
          />
        ) : (
          <EmptyState compact title={t("participants.empty")} />
        )}
      </Section>
    );
  }
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

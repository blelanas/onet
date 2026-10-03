import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Award, CalendarClock, HeartHandshake, HeartPulse, MessageCircle, Star } from "lucide-react";
import { hasRole, pageQuery, requireUser } from "@/lib/auth/guards";
import { CATEGORY_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { ageFrom, cn } from "@/lib/utils";
import { myChildDetail, myChildrenOverview } from "@/server/dashboard/my-children";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { InfoList, Section } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import { Ring, rateColor } from "@/components/dashboard/ring";
import { WeekSchedule } from "@/components/dashboard/week-schedule";
import { dayLabel, hhmm } from "@/components/dashboard/widgets";

export async function generateMetadata() {
  const t = await getTranslations("dashboard.myChildren");
  return { title: t("title") };
}

export default async function MyChildrenPage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const user = await requireUser();
  if (!hasRole(user, "parent")) redirect("/dashboard/forbidden");
  const { child: childParam } = await searchParams;
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const locale = await getLocale();
  const kids = await myChildrenOverview(user);
  const header = <PageHeader title={t("myChildren.title")} description={t("myChildren.description")} icon={<HeartHandshake className="size-6" />} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("myChildren.title") }]} />;

  if (!kids.length)
    return (
      <>
        {header}
        <div className="card">
          <EmptyState title={t("parent.noChildren")} description={t("parent.noChildrenHint")} icon={<HeartHandshake className="size-4" />} action={<LinkButton href="/dashboard/messages">{t("parent.messages")}</LinkButton>} />
        </div>
      </>
    );

  const selectedId = kids.find((k) => k.id === childParam)?.id ?? kids[0].id;
  const d = await pageQuery(myChildDetail(user, selectedId));
  const nextLabels = await Promise.all(kids.map((k) => (k.next ? dayLabel(k.next.at) : Promise.resolve(""))));
  const c = d.child;
  const accent = c.group?.color ?? "#7C4DFF";

  return (
    <>
      {header}

      {/* Child cards — tap to switch */}
      <ul className="scrollbar-none -mx-4 mb-6 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-3">
        {kids.map((k, i) => {
          const active = k.id === selectedId;
          return (
            <li key={k.id} className="w-[82%] max-w-sm shrink-0 snap-start sm:w-auto sm:max-w-none">
              <Link
                href={`/dashboard/my-children?child=${k.id}`}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={cn("card card-hover relative block h-full overflow-hidden p-4", active && "ring-2 ring-offset-2 ring-offset-canvas")}
                style={active ? ({ "--tw-ring-color": k.group?.color ?? "#7C4DFF" } as React.CSSProperties) : undefined}
              >
                <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: k.group?.color ?? "#7C4DFF" }} aria-hidden />
                <div className="flex items-center gap-3">
                  <Avatar firstName={k.firstName} lastName={k.lastName} src={k.photoUrl} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-extrabold text-ink">{k.firstName}</p>
                    <p className="truncate text-xs text-muted">
                      {k.dateOfBirth && tc("fields.years", { count: ageFrom(k.dateOfBirth) ?? 0 })} {k.group && `· ${k.group.name}`}
                    </p>
                  </div>
                  <Ring value={k.attendance.rate ?? 0} size={52} stroke={6} color={rateColor(k.attendance.rate)} label={k.attendance.rate != null ? t("myChildren.rate", { rate: k.attendance.rate }) : t("parent.noAttendance")}>
                    <span className="text-[11px] font-extrabold text-ink">{k.attendance.rate != null ? `${k.attendance.rate}%` : "—"}</span>
                  </Ring>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                  <span className="inline-flex items-center gap-1 rounded-full bg-sun-soft px-2 py-0.5 text-amber-700">
                    <Star className="size-3" fill="currentColor" /> {k.points}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-grape-soft px-2 py-0.5 text-violet-700">
                    <Award className="size-3" /> {t("parent.badges", { count: k.badges })}
                  </span>
                  {k.next && (
                    <span className="inline-flex min-w-0 items-center gap-1 truncate text-muted">
                      <CalendarClock className="size-3 shrink-0" /> {nextLabels[i]} {hhmm(k.next.at, locale)}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Selected child */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="card overflow-hidden">
            <div className="relative h-20" style={{ background: `linear-gradient(120deg, ${accent}, ${accent}B3 60%, #FFB400AA)` }}>
              <div className="bg-confetti absolute inset-0 opacity-70" aria-hidden />
            </div>
            <div className="flex flex-col gap-3 px-5 pb-5 sm:flex-row sm:items-end">
              <Avatar firstName={c.firstName} lastName={c.lastName} src={c.photoUrl} size="xl" ring className="-mt-10 shadow-lg" />
              <div className="min-w-0 flex-1 sm:pt-3">
                <h2 className="text-2xl font-extrabold text-ink">
                  {c.firstName} {c.lastName}
                </h2>
                {c.firstNameAr && (
                  <p className="text-sm text-muted" dir="rtl" lang="ar">
                    {c.firstNameAr} {c.lastNameAr}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <LinkButton href={`/dashboard/achievements?child=${c.id}`} variant="outline" size="sm">
                  <Award className="size-4" /> {t("parent.seeAchievements")}
                </LinkButton>
                <LinkButton href={`/dashboard/members/${c.id}`} size="sm">
                  {t("myChildren.openProfile")} <ArrowRight className="rtl-flip size-4" />
                </LinkButton>
              </div>
            </div>
            <div className="border-t border-line px-5 py-2">
              <InfoList
                items={[
                  { label: t("myChildren.number"), value: <span dir="ltr">{c.membershipNumber}</span> },
                  ...(c.dateOfBirth ? [{ label: tc("fields.age"), value: `${formatDate(c.dateOfBirth, locale)} · ${tc("fields.years", { count: ageFrom(c.dateOfBirth) ?? 0 })}` }] : []),
                  { label: tc("fields.status"), value: <StatusBadge status={c.membershipStatus} /> },
                  { label: t("myChildren.since"), value: formatDate(c.membershipDate, locale) },
                ]}
              />
              {c.medicalNotes && (
                <div className="my-3 flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                  <HeartPulse className="mt-0.5 size-4 shrink-0" />
                  <span>
                    <strong className="block">{t("myChildren.medical")}</strong>
                    {c.medicalNotes}
                  </span>
                </div>
              )}
            </div>
          </section>

          <Section title={t("myChildren.schedule")}>
            <WeekSchedule sessions={d.week} empty={t("myChildren.noSchedule")} scrollOnly />
          </Section>

          <Section title={t("myChildren.registrations")} href="/dashboard/registrations" actionLabel={tc("actions.viewAll")}>
            {d.registrations.length ? (
              <ul className="divide-y divide-line">
                {d.registrations.map((r) => (
                  <li key={r.id}>
                    <Link href={r.href} className="flex items-center justify-between gap-3 py-2.5 hover:text-brand-700">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-ink">{r.title}</span>
                        <span className="block text-xs text-muted">
                          {t(`kind.${r.kind}`)} · {formatDate(r.at, locale)}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-wrap justify-end gap-1">
                        {r.documentsStatus && r.status !== "CANCELLED" && <StatusBadge status={r.documentsStatus} />}
                        <StatusBadge status={r.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted">{t("myChildren.noRegistrations")}</p>
            )}
          </Section>
        </div>

        <div className="space-y-5">
          <Section title={t("myChildren.groupMonitors")}>
            {c.group ? (
              <>
                <Link href={`/dashboard/groups/${c.group.id}`} className="block rounded-2xl p-4 text-white" style={{ background: `linear-gradient(135deg, ${c.group.color}, ${c.group.color}CC)` }}>
                  <p className="font-display text-xl font-extrabold">{c.group.name}</p>
                  {c.group.schedule && <p className="text-sm text-white/85">{c.group.schedule}</p>}
                  {c.group.location && <p className="text-xs text-white/75">{c.group.location}</p>}
                </Link>
                <ul className="mt-4 space-y-2">
                  {c.group.monitors.map((m) => (
                    <li key={m.member.id} className="flex items-center gap-3">
                      <Avatar firstName={m.member.firstName} lastName={m.member.lastName} src={m.member.photoUrl} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-ink">
                          {m.member.firstName} {m.member.lastName}
                        </span>
                        {m.isLead && <span className="block text-xs text-muted">{t("monitor.lead")}</span>}
                      </span>
                      {m.member.userId && (
                        <LinkButton href={`/dashboard/messages?to=${m.member.userId}`} variant="soft" size="sm" aria-label={t("myChildren.contactMonitor")}>
                          <MessageCircle className="size-4" /> <span className="hidden sm:inline">{t("myChildren.contactMonitor")}</span>
                        </LinkButton>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted">{t("parent.noGroup")}</p>
            )}
          </Section>

          <Section title={t("myChildren.activities")}>
            {c.activityEnrollments.length ? (
              <ul className="space-y-2">
                {c.activityEnrollments.map(({ activity: a }) => (
                  <li key={a.id}>
                    <Link href={`/dashboard/activities/${a.id}`} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2 hover:border-brand-200">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLORS[a.category] }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-ink">{a.title}</span>
                        <span className="block truncate text-xs text-muted">{a.schedule}</span>
                      </span>
                      <Badge color={CATEGORY_COLORS[a.category]}>{tc(`enums.activityCategory.${a.category}`)}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t("myChildren.noActivities")}</p>
            )}
          </Section>

          <Section title={t("myChildren.attendanceHistory")} href={`/dashboard/members/${c.id}?tab=attendance`} actionLabel={tc("actions.details")}>
            {d.history.length ? (
              <ul className="divide-y divide-line">
                {d.history.slice(0, 10).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: a.group?.color ?? "#7a7390" }} />
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{formatDate(a.date, locale)}</span>
                        <span className="block truncate text-xs text-muted">{a.group?.name ?? a.activity?.title ?? a.event?.title ?? a.trip?.title}</span>
                      </span>
                    </span>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t("parent.noAttendance")}</p>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}

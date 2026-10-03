import { useLocale, useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { Backpack, CalendarClock, CalendarRange, ClipboardCheck, Clock, Edit, Globe, Lock, MapPin, PartyPopper, Trash2, UserMinus, Users } from "lucide-react";
import type { activityPage } from "@api/modules/activities/routes";
import { formatDate, toDateInput } from "@onet/shared";
import { can, useMe } from "@/lib/auth";
import { useApi } from "@/lib/query";
import { useParams, useSearchParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { ageFrom, cn } from "@/lib/utils";
import { deleteActivity, deleteActivityReport, enrollChild, unenrollChild } from "@/api/activities";
import { RequirePerm } from "@/components/states/guards";
import { QueryView } from "@/components/states/page-state";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CoverArt } from "@/components/ui/cover-art";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumbs } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { InfoList, Section } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import { LinkTabs } from "@/components/ui/tabs";
import { CategoryIcon, categoryColor } from "@/components/activities/category-icon";
import { ReportForm } from "@/components/activities/report-form";
import { ChildPicker } from "@/components/groups/child-picker";
import { ATTENDANCE_COLORS } from "@/components/attendance/status-style";

type Data = Loaded<typeof activityPage>;

export function Component() {
  return (
    <RequirePerm perm="activities.read">
      <ActivityDetail />
    </RequirePerm>
  );
}

function ActivityDetail() {
  const { id } = useParams();
  const tab = useSearchParams().get("tab") ?? undefined;
  // Tab data is loaded server-side for the active tab only, so the tab is part of the query.
  const query = useApi<Data>(`/activities/${id}`, { tab });
  return <QueryView query={query}>{(data) => <ActivityView id={id!} data={data} />}</QueryView>;
}

function ActivityView({ id, data }: { id: string; data: Data }) {
  const user = useMe();
  const { activity: a, canManage, isStaffView, tabKeys, tab, participants, sessions, reports, candidates, upcoming, today } = data;
  usePageTitle(a.title);
  const t = useTranslations("activities");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const color = categoryColor(a.category);
  const base = `/dashboard/activities/${id}`;
  const kid = user.roles.includes("kid") && user.roles.length === 1;
  const full = a._count.participants >= a.capacity;

  const tabs = tabKeys.map((k) => ({
    key: k,
    label: t(`tabs.${k}`),
    href: k === "overview" ? base : `${base}?tab=${k}`,
    count: k === "participants" ? (isStaffView ? a._count.participants : participants.length) : k === "reports" ? a._count.reports : undefined,
  }));

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title"), href: "/dashboard/activities" }, { label: a.title }]} />

      <div className={cn("card overflow-hidden", kid && "rounded-3xl")}>
        <CoverArt src={a.coverUrl} seed={a.id} color={color} icon={<CategoryIcon category={a.category} />} className="h-48 sm:h-60" alt={a.title}>
          <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
            <div className="min-w-0 text-white">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-extrabold" style={{ color }}>
                  <CategoryIcon category={a.category} className="size-3.5" /> {tc(`enums.activityCategory.${a.category}`)}
                </span>
                {a.status !== "ACTIVE" && <StatusBadge status={a.status} className="bg-white" />}
                {isStaffView && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold backdrop-blur">
                    {a.isPublic ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />} {a.isPublic ? t("public") : t("private")}
                  </span>
                )}
              </div>
              <h1 className={cn("font-display font-extrabold drop-shadow", kid ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl")}>{a.title}</h1>
            </div>
            {canManage && (
              <div className="flex shrink-0 gap-2">
                <LinkButton href={`${base}/edit`} variant="outline" size="sm" className="border-white/40 bg-white/90">
                  <Edit className="size-4" /> {tc("actions.edit")}
                </LinkButton>
                <ConfirmButton action={deleteActivity.bind(null, id)} variant="outline" size="sm" className="border-white/40 bg-white/90" title={t("deleteTitle")} description={t("deleteText")} redirectTo="/dashboard/activities" ariaLabel={tc("actions.delete")}>
                  <Trash2 className="size-4 text-red-600" />
                </ConfirmButton>
              </div>
            )}
          </div>
        </CoverArt>
      </div>

      <LinkTabs tabs={tabs} active={tab} className="mb-0" />

      {tab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <Section title={t("detail.about")}>
              <p className="whitespace-pre-line text-ink-2">{a.description || t("detail.noDescription")}</p>
              {a.materials && (
                <div className="mt-4 flex gap-3 rounded-2xl p-3 text-sm" style={{ background: `${color}12` }}>
                  <Backpack className="mt-0.5 size-5 shrink-0" style={{ color }} />
                  <div>
                    <p className="font-bold text-ink">{t("detail.materials")}</p>
                    <p className="text-ink-2">{a.materials}</p>
                  </div>
                </div>
              )}
            </Section>
            <Section title={t("detail.practical")}>
              <InfoList
                items={[
                  { icon: <CalendarClock className="size-4" />, label: t("detail.when"), value: a.dayOfWeek != null ? `${t("detail.every", { day: locale === "fr" ? tc(`enums.weekday.${a.dayOfWeek}`).toLowerCase() : tc(`enums.weekday.${a.dayOfWeek}`) })}${a.startTime ? ` · ${a.startTime}` : ""}` : (a.schedule ?? "—") },
                  { icon: <Clock className="size-4" />, label: t("detail.duration"), value: tc("fields.minutes", { count: a.durationMin }) },
                  { icon: <CalendarRange className="size-4" />, label: t("detail.period"), value: a.startDate || a.endDate ? `${formatDate(a.startDate, locale)} → ${formatDate(a.endDate, locale)}` : "—" },
                  { icon: <Users className="size-4" />, label: tc("fields.ageRange"), value: a.ageMin != null ? (a.ageMax != null ? t("ages", { min: a.ageMin, max: a.ageMax }) : t("agesFrom", { min: a.ageMin })) : tc("enums.ageGroup.ALL") },
                  { icon: <MapPin className="size-4" />, label: tc("fields.location"), value: a.location ?? "—" },
                  ...(a.group ? [{ label: tc("fields.group"), value: can(user, "groups.read") ? <Link href={`/dashboard/groups/${a.group.id}`} className="hover:underline"><Badge color={a.group.color}>{a.group.name}</Badge></Link> : <Badge color={a.group.color}>{a.group.name}</Badge> }] : []),
                  ...(a.event ? [{ icon: <PartyPopper className="size-4" />, label: t("detail.event"), value: <Link href={`/dashboard/events/${a.event.id}`} className="text-brand-700 hover:underline">{a.event.title}</Link> }] : []),
                ]}
              />
            </Section>
          </div>
          <div className="space-y-5">
            {!kid && (
              <Section title={t("detail.places")}>
                <div className="flex items-end justify-between">
                  <span className="font-display text-4xl font-extrabold text-ink tabular-nums">
                    {a._count.participants}
                    <span className="text-lg text-muted">/{a.capacity}</span>
                  </span>
                  <span className={cn("text-sm font-bold", full ? "text-red-600" : "text-emerald-600")}>{tc("fields.placesLeft", { count: Math.max(0, a.capacity - a._count.participants) })}</span>
                </div>
                <Progress value={a._count.participants} max={a.capacity} color={full ? "#E30613" : color} className="mt-3 h-2.5" />
              </Section>
            )}
            {a.monitor && (
              <Section title={tc("fields.monitor")}>
                <div className="flex items-center gap-3">
                  <Avatar firstName={a.monitor.firstName} lastName={a.monitor.lastName} src={a.monitor.photoUrl} size="lg" />
                  <div className="min-w-0">
                    <p className="font-bold text-ink">
                      {a.monitor.firstName} {a.monitor.lastName}
                    </p>
                    {a.monitor.userId && a.monitor.userId !== user.id && can(user, "messages.use") && (
                      <Link href={`/dashboard/messages?to=${a.monitor.userId}`} className="text-sm font-bold text-brand-700 hover:underline">
                        {t("detail.contact")}
                      </Link>
                    )}
                  </div>
                </div>
              </Section>
            )}
            {upcoming.length > 0 && (
              <Section title={t("detail.next")}>
                <ul className="space-y-2">
                  {upcoming.map((d, i) => (
                    <li key={d.toISOString()} className="flex items-center gap-3 rounded-xl border border-line p-2.5 text-sm" style={i === 0 ? { borderColor: color, background: `${color}0D` } : undefined}>
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg font-display font-extrabold text-white" style={{ background: i === 0 ? color : "#c9bfd9" }}>
                        {d.getDate()}
                      </span>
                      <span className="font-semibold text-ink">{formatDate(d, locale, "long")}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        </div>
      )}

      {tab === "participants" && (
        <Section
          title={isStaffView ? t("participants.title", { count: a._count.participants, capacity: a.capacity }) : t("participants.mine")}
          action={
            canManage ? (
              <ChildPicker
                action={enrollChild.bind(null, id)}
                full={full}
                ageMin={a.ageMin}
                ageMax={a.ageMax}
                labels={{ button: t("participants.enroll"), title: t("participants.enrollTitle"), success: t("participants.enrolled") }}
                candidates={candidates.map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName, photoUrl: c.photoUrl, age: ageFrom(c.dateOfBirth), group: c.group }))}
              />
            ) : undefined
          }
        >
          {participants.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {participants.map((p) => (
                <li key={p.memberId} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                  <Avatar firstName={p.member.firstName} lastName={p.member.lastName} src={p.member.photoUrl} />
                  <div className="min-w-0 flex-1">
                    {kid ? (
                      <p className="truncate font-bold text-ink">
                        {p.member.firstName} {p.member.lastName}
                      </p>
                    ) : (
                      <Link href={`/dashboard/members/${p.memberId}`} className="block truncate font-bold text-ink hover:text-brand-700">
                        {p.member.firstName} {p.member.lastName}
                      </Link>
                    )}
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      {p.member.dateOfBirth && tc("fields.years", { count: ageFrom(p.member.dateOfBirth) ?? 0 })}
                      {p.member.group && <Badge color={p.member.group.color}>{p.member.group.name}</Badge>}
                    </p>
                  </div>
                  {canManage && (
                    <ConfirmButton action={unenrollChild.bind(null, id, p.memberId)} size="icon-sm" title={t("participants.unenrollTitle")} description={t("participants.unenrollText", { name: p.member.firstName })} confirmLabel={tc("actions.remove")} successMessage="toast.saved" ariaLabel={tc("actions.remove")}>
                      <UserMinus className="size-4 text-muted" />
                    </ConfirmButton>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact title={isStaffView ? t("participants.empty") : t("participants.emptyMine")} icon={<Users className="size-4" />} />
          )}
        </Section>
      )}

      {tab === "attendance" && (
        <Section
          title={t("attendance.title")}
          action={
            canManage && can(user, "attendance.manage") ? (
              <LinkButton href={`/dashboard/attendance?ctx=activity:${id}`} size="sm" variant="soft">
                <ClipboardCheck className="size-4" /> {t("attendance.take")}
              </LinkButton>
            ) : undefined
          }
        >
          {sessions.length ? (
            <ul className="space-y-3">
              {sessions.map((s) => {
                const ok = (s.counts.PRESENT ?? 0) + (s.counts.LATE ?? 0);
                return (
                  <li key={s.date.toISOString()} className="rounded-2xl border border-line p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-ink">{formatDate(s.date, locale, "long")}</span>
                      {isStaffView ? (
                        <span className="flex items-center gap-2 text-xs font-bold">
                          {(["PRESENT", "LATE", "EXCUSED", "ABSENT"] as const).map((k) =>
                            s.counts[k] ? (
                              <span key={k} className="inline-flex items-center gap-1" style={{ color: ATTENDANCE_COLORS[k] }}>
                                <span className="size-2 rounded-full" style={{ background: ATTENDANCE_COLORS[k] }} /> {s.counts[k]}
                              </span>
                            ) : null,
                          )}
                          <span className="text-muted">· {Math.round((ok / s.total) * 100)}%</span>
                        </span>
                      ) : (
                        <span className="flex flex-wrap gap-1.5">
                          {s.rows.map((r) => (
                            <span key={r.member.id} className="inline-flex items-center gap-1.5 text-xs">
                              <span className="font-semibold text-ink-2">{r.member.firstName}</span> <StatusBadge status={r.status} />
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                    {isStaffView && (
                      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-surface-2">
                        {(["PRESENT", "LATE", "EXCUSED", "ABSENT"] as const).map((k) => (
                          <span key={k} style={{ width: `${((s.counts[k] ?? 0) / s.total) * 100}%`, background: ATTENDANCE_COLORS[k] }} />
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState compact title={t("attendance.empty")} icon={<ClipboardCheck className="size-4" />} />
          )}
        </Section>
      )}

      {tab === "reports" && isStaffView && (
        <Section title={t("reports.title")}>
          {canManage && <ReportForm activityId={id} defaultDate={toDateInput(today)} />}
          {reports.length ? (
            <ol className="relative space-y-4 border-s-2 border-line ps-5">
              {reports.map((r) => (
                <li key={r.id} className="relative">
                  <span className="absolute -start-[27px] top-1 size-3 rounded-full ring-4 ring-surface" style={{ background: color }} />
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-extrabold text-ink">{formatDate(r.date, locale, "long")}</p>
                    {(r.author.id === user.id || can(user, "members.read_all")) && (
                      <ConfirmButton action={deleteActivityReport.bind(null, r.id)} size="icon-sm" ariaLabel={tc("actions.delete")}>
                        <Trash2 className="size-4 text-muted" />
                      </ConfirmButton>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm text-ink-2">{r.summary}</p>
                  <p className="mt-1 text-xs text-muted">{r.author.name}</p>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState compact title={t("reports.empty")} />
          )}
        </Section>
      )}
    </div>
  );
}

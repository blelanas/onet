import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AlertTriangle, Cake, Edit, HeartPulse, KeyRound, Mail, MapPin, Phone, Plus, Trash2 } from "lucide-react";
import { requirePagePermission, can, pageQuery } from "@/lib/auth/guards";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { ageFrom, cn } from "@/lib/utils";
import { paidAmount } from "@/lib/services/invoices";
import { getMemberProfile, memberAttendance, memberInvoices } from "@/server/members/queries";
import { deleteMember, unlinkGuardian } from "@/server/members/actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumbs } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { InfoList, Section } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import { LinkTabs } from "@/components/ui/tabs";
import { EntityDocuments } from "@/components/documents/entity-documents";
import { AccountForm, LinkParentForm } from "@/components/members/profile-forms";
import { memberOptions } from "@/server/members/queries";

export default async function MemberProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const user = await requirePagePermission("members.read");
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  const m = await pageQuery(getMemberProfile(user, id));
  const t = await getTranslations("people");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const locale = await getLocale();
  const canManage = can(user, "members.manage");
  const isChild = m.type === "CHILD";
  const age = ageFrom(m.dateOfBirth);
  const accent = m.group?.color ?? "#E30613";

  const [attendance, invoices] = await Promise.all([memberAttendance(id, 60), memberInvoices(user, id)]);
  const presentCount = attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const rate = attendance.length ? Math.round((presentCount / attendance.length) * 100) : null;

  const base = `/dashboard/members/${id}`;
  const tabs = [
    { key: "overview", label: t("profile.tabs.overview"), href: base },
    ...(isChild || m.type === "MEMBER" ? [{ key: "attendance", label: t("profile.tabs.attendance"), href: `${base}?tab=attendance`, count: attendance.length }] : []),
    { key: "participation", label: t("profile.tabs.participation"), href: `${base}?tab=participation`, count: m.eventRegistrations.length + m.tripRegistrations.length },
    ...(invoices ? [{ key: "payments", label: t("profile.tabs.payments"), href: `${base}?tab=payments`, count: invoices.length }] : []),
    { key: "documents", label: t("profile.tabs.documents"), href: `${base}?tab=documents` },
  ];

  const listHref = isChild ? "/dashboard/children" : m.type === "PARENT" ? "/dashboard/parents" : m.type === "MONITOR" ? "/dashboard/monitors" : "/dashboard/members";
  const parents = canManage && isChild ? await memberOptions(["PARENT", "MEMBER", "STAFF", "MONITOR"]) : [];

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: tn("items.dashboard"), href: "/dashboard" },
          ...(user.permissions.has("members.read_all") || isChild ? [{ label: tn(`items.${isChild ? "children" : m.type === "PARENT" ? "parents" : m.type === "MONITOR" ? "monitors" : "members"}`), href: listHref }] : []),
          { label: `${m.firstName} ${m.lastName}` },
        ]}
      />

      {/* Header */}
      <div className="card overflow-hidden">
        <div className="relative h-28 sm:h-32" style={{ background: `linear-gradient(120deg, ${accent}, ${accent}B3 60%, #FFB400AA)` }}>
          <div className="bg-confetti absolute inset-0 opacity-70" />
        </div>
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:px-6">
          <Avatar firstName={m.firstName} lastName={m.lastName} src={m.photoUrl} size="xl" ring className="-mt-10 shadow-lg sm:-mt-12" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">
              {m.firstName} {m.lastName}
            </h1>
            {m.firstNameAr && (
              <p className="text-muted ltr:text-left" dir="rtl" lang="ar">
                {m.firstNameAr} {m.lastNameAr}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{tc(`enums.memberType.${m.type}`)}</Badge>
              <StatusBadge status={m.membershipStatus} />
              {m.group && <Badge color={m.group.color}>{m.group.name}</Badge>}
              <span className="text-xs font-bold text-muted" dir="ltr">
                {m.membershipNumber}
              </span>
            </div>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <LinkButton href={`${base}/edit`} variant="outline">
                <Edit className="size-4" /> {tc("actions.edit")}
              </LinkButton>
              <ConfirmButton action={deleteMember.bind(null, id)} variant="outline" size="md" title={t("profile.deleteTitle")} description={t("profile.deleteText")} redirectTo={listHref} ariaLabel={tc("actions.delete")}>
                <Trash2 className="size-4 text-red-600" />
              </ConfirmButton>
            </div>
          )}
        </div>
      </div>

      <LinkTabs tabs={tabs} active={tab} className="mb-0" />

      {tab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <Section title={t("profile.personal")}>
              <InfoList
                items={[
                  ...(m.dateOfBirth ? [{ icon: <Cake className="size-4" />, label: tc("fields.age"), value: `${formatDate(m.dateOfBirth, locale)} · ${tc("fields.years", { count: age ?? 0 })}` }] : []),
                  ...(m.gender ? [{ label: t("form.gender"), value: tc(`enums.gender.${m.gender}`) }] : []),
                  { icon: <Phone className="size-4" />, label: tc("fields.phone"), value: m.phone ? <span dir="ltr">{m.phone}</span> : "—" },
                  { icon: <Mail className="size-4" />, label: tc("fields.email"), value: m.email ?? "—" },
                  { icon: <MapPin className="size-4" />, label: tc("fields.address"), value: m.address ?? "—" },
                  { label: t("columns.since"), value: formatDate(m.membershipDate, locale) },
                ]}
              />
            </Section>

            {/* Family */}
            {(isChild || m.type === "PARENT" || m.childrenLinks.length > 0) && (
              <Section title={isChild ? t("profile.parents") : t("profile.children")}>
                {isChild ? (
                  m.parentLinks.length ? (
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {m.parentLinks.map((l) => (
                        <li key={l.parentId} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                          <Avatar firstName={l.parent.firstName} lastName={l.parent.lastName} />
                          <div className="min-w-0 flex-1">
                            <Link href={`/dashboard/members/${l.parentId}`} className="block truncate font-bold text-ink hover:text-brand-600">
                              {l.parent.firstName} {l.parent.lastName}
                            </Link>
                            <p className="text-xs text-muted">
                              {tc(`enums.relation.${l.relation}`)} {l.parent.phone && <span dir="ltr">· {l.parent.phone}</span>}
                            </p>
                          </div>
                          {canManage && (
                            <ConfirmButton action={unlinkGuardian.bind(null, id, l.parentId)} size="icon-sm" ariaLabel={t("profile.unlink")} successMessage="toast.saved">
                              <Trash2 className="size-4 text-muted" />
                            </ConfirmButton>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted">{t("profile.noFamily")}</p>
                  )
                ) : m.childrenLinks.length ? (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {m.childrenLinks.map((l) => (
                      <li key={l.childId}>
                        <Link href={`/dashboard/members/${l.childId}`} className="card-hover flex items-center gap-3 rounded-2xl border border-line p-3">
                          <Avatar firstName={l.child.firstName} lastName={l.child.lastName} src={l.child.photoUrl} />
                          <div className="min-w-0">
                            <p className="truncate font-bold text-ink">
                              {l.child.firstName} {l.child.lastName}
                            </p>
                            <p className="text-xs text-muted">
                              {l.child.dateOfBirth && tc("fields.years", { count: ageFrom(l.child.dateOfBirth) ?? 0 })} {l.child.group && `· ${l.child.group.name}`}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">{t("profile.noFamily")}</p>
                )}
                {canManage && isChild && <LinkParentForm childId={id} parents={parents.filter((p) => !m.parentLinks.some((l) => l.parentId === p.id))} />}
                {canManage && m.type === "PARENT" && (
                  <LinkButton href={`/dashboard/members/new?type=CHILD&parent=${id}`} variant="soft" size="sm" className="mt-4">
                    <Plus className="size-4" /> {t("new.CHILD")}
                  </LinkButton>
                )}
              </Section>
            )}

            <Section title={t("profile.activities")}>
              {m.activityEnrollments.length ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {m.activityEnrollments.map((e) => (
                    <li key={e.activityId}>
                      <Link href={`/dashboard/activities/${e.activityId}`} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5 text-sm hover:border-brand-200">
                        <span className="truncate font-bold text-ink">{e.activity.title}</span>
                        <Badge tone="neutral">{tc(`enums.activityCategory.${e.activity.category}`)}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">{t("profile.noActivities")}</p>
              )}
            </Section>
          </div>

          <div className="space-y-5">
            {rate !== null && (
              <Section title={t("profile.attendanceRate")}>
                <div className="flex items-end gap-2">
                  <span className={cn("font-display text-4xl font-extrabold", rate >= 80 ? "text-emerald-600" : rate >= 60 ? "text-amber-600" : "text-red-600")}>{rate}%</span>
                  <span className="pb-1.5 text-sm text-muted">
                    {presentCount}/{attendance.length}
                  </span>
                </div>
                <Progress value={rate} className="mt-3" color={rate >= 80 ? "#2BB673" : rate >= 60 ? "#FFB400" : "#E30613"} />
              </Section>
            )}

            {m.group && (
              <Section title={t("profile.groupCard")}>
                <Link href={`/dashboard/groups/${m.group.id}`} className="flex items-center gap-3 rounded-2xl p-3 text-white" style={{ background: m.group.color }}>
                  <div>
                    <p className="font-display text-lg font-extrabold">{m.group.name}</p>
                    <p className="text-sm text-white/85">{m.group.schedule}</p>
                  </div>
                </Link>
                <p className="mt-4 mb-2 text-xs font-extrabold tracking-wide text-muted uppercase">{t("profile.monitorsOfGroup")}</p>
                <ul className="space-y-2">
                  {m.group.monitors.map((gm) => (
                    <li key={gm.memberId} className="flex items-center gap-2 text-sm">
                      <Avatar firstName={gm.member.firstName} lastName={gm.member.lastName} size="sm" />
                      <span className="font-semibold text-ink">
                        {gm.member.firstName} {gm.member.lastName}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {m.monitoredGroups.length > 0 && (
              <Section title={t("form.monitorGroups")}>
                <ul className="space-y-2">
                  {m.monitoredGroups.map((g) => (
                    <li key={g.groupId}>
                      <Link href={`/dashboard/groups/${g.groupId}`} className="flex items-center justify-between rounded-xl border border-line px-3 py-2 hover:border-brand-200">
                        <span className="flex items-center gap-2 font-bold text-ink">
                          <span className="size-3 rounded-full" style={{ background: g.group.color }} /> {g.group.name}
                        </span>
                        <span className="text-xs text-muted">{g.group._count.children}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {(m.emergencyName || m.medicalNotes) && (
              <Section title={t("profile.emergency")}>
                <InfoList
                  items={[
                    ...(m.emergencyName ? [{ icon: <AlertTriangle className="size-4" />, label: t("form.emergencyName"), value: m.emergencyName }] : []),
                    ...(m.emergencyPhone ? [{ icon: <Phone className="size-4" />, label: t("form.emergencyPhone"), value: <span dir="ltr">{m.emergencyPhone}</span> }] : []),
                  ]}
                />
                {m.medicalNotes && (
                  <div className="mt-3 flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                    <HeartPulse className="mt-0.5 size-4 shrink-0" /> {m.medicalNotes}
                  </div>
                )}
              </Section>
            )}

            {m.badges.length > 0 && (
              <Section title={t("profile.badges")}>
                <ul className="grid grid-cols-3 gap-2">
                  {m.badges.map((b) => (
                    <li key={b.badgeId} className="flex flex-col items-center gap-1 rounded-2xl p-2 text-center" style={{ background: `${b.badge.color}14` }} title={b.badge.description ?? ""}>
                      <span className="grid size-10 place-items-center rounded-full text-lg text-white" style={{ background: b.badge.color }}>
                        ★
                      </span>
                      <span className="text-[11px] leading-tight font-bold text-ink-2">{b.badge.name}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {can(user, "users.manage") && (
              <Section title={t("profile.account")}>
                {m.user ? (
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2 text-ink-2">
                      <KeyRound className="size-4 text-leaf" /> {t("profile.hasAccount", { email: m.user.email })}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {m.user.roles.map((r) => (
                        <Badge key={r.roleId} color={r.role.color}>
                          {tc(`roles.${r.role.key}`)}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted">
                      {t("profile.lastLogin")} : {formatDateTime(m.user.lastLoginAt, locale)}
                    </p>
                  </div>
                ) : (
                  <AccountForm memberId={id} defaultEmail={m.email ?? ""} defaultRole={isChild ? "kid" : m.type === "PARENT" ? "parent" : m.type === "MONITOR" ? "monitor" : "member"} canAdmin={can(user, "roles.manage")} />
                )}
              </Section>
            )}
          </div>
        </div>
      )}

      {tab === "attendance" && (
        <Section title={t("profile.tabs.attendance")}>
          {attendance.length ? (
            <ul className="divide-y divide-line">
              {attendance.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="flex items-center gap-3">
                    <span className="size-2.5 rounded-full" style={{ background: a.group?.color ?? "#7a7390" }} />
                    <span className="font-semibold text-ink">{formatDate(a.date, locale, "long")}</span>
                    <span className="hidden text-muted sm:inline">{a.group?.name ?? a.activity?.title ?? a.event?.title ?? a.trip?.title}</span>
                  </span>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact title={tc("states.empty")} />
          )}
        </Section>
      )}

      {tab === "participation" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Section title={t("profile.events")}>
            {m.eventRegistrations.length ? (
              <ul className="divide-y divide-line">
                {m.eventRegistrations.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <Link href={`/dashboard/events/${r.eventId}`} className="min-w-0">
                      <span className="block truncate font-bold text-ink hover:text-brand-600">{r.event.title}</span>
                      <span className="text-xs text-muted">{formatDate(r.event.startAt, locale)}</span>
                    </Link>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact title={tc("states.empty")} />
            )}
          </Section>
          <Section title={t("profile.trips")}>
            {m.tripRegistrations.length ? (
              <ul className="divide-y divide-line">
                {m.tripRegistrations.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <Link href={`/dashboard/trips/${r.tripId}`} className="min-w-0">
                      <span className="block truncate font-bold text-ink hover:text-brand-600">{r.trip.title}</span>
                      <span className="text-xs text-muted">{formatDate(r.trip.departAt, locale)}</span>
                    </Link>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact title={tc("states.empty")} />
            )}
          </Section>
        </div>
      )}

      {tab === "payments" && invoices && (
        <Section title={t("profile.tabs.payments")}>
          {invoices.length ? (
            <>
              <p className="mb-4 text-sm text-ink-2">
                {t("profile.totalDue")} :{" "}
                <strong className="text-brand-700">{formatMoney(invoices.filter((i) => i.status !== "CANCELLED").reduce((s, i) => s + i.amount - paidAmount(i), 0), locale)}</strong>
              </p>
              <ul className="divide-y divide-line">
                {invoices.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <Link href={`/dashboard/finance/invoices/${inv.id}`} className="min-w-0">
                      <span className="block truncate font-bold text-ink hover:text-brand-600">{inv.description}</span>
                      <span className="text-xs text-muted" dir="ltr">
                        {inv.number} · {formatDate(inv.issuedAt, locale)}
                      </span>
                    </Link>
                    <span className="flex items-center gap-3">
                      <span className="font-bold tabular-nums">{formatMoney(inv.amount, locale)}</span>
                      <StatusBadge status={inv.status} />
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <EmptyState compact title={t("profile.noInvoices")} />
          )}
        </Section>
      )}

      {tab === "documents" && (
        <Section title={t("profile.tabs.documents")}>
          <EntityDocuments user={user} entityType="MEMBER" entityId={id} revalidate={base} />
        </Section>
      )}
    </div>
  );
}

import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Award, Bus, CheckCircle2, FileText, HeartHandshake, MessageCircle, PartyPopper, Receipt, Star, Users, Wallet } from "lucide-react";
import type { CurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/guards";
import { CATEGORY_COLORS } from "@/lib/constants";
import { formatDate} from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { ageFrom, cn } from "@/lib/utils";
import { parentDashboard } from "@/server/dashboard/parent";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClasses, LinkButton } from "@/components/ui/button";
import { CoverArt } from "@/components/ui/cover-art";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import { ChildSwitcher } from "./child-switcher";
import { GreetingHeader } from "./greeting-header";
import { Ring, rateColor } from "./ring";
import { AgendaList, AnnouncementList, NotificationList, ScrollStrip, StripItem, dayLabel , hhmm } from "./widgets";

const ATT_COLORS: Record<string, string> = { PRESENT: "bg-[#1E9460]", LATE: "bg-[#D98B00]", EXCUSED: "bg-[#1683C0]", ABSENT: "bg-brand-600" };

export async function ParentDashboard({ user, childId }: { user: CurrentUser; childId?: string }) {
  const d = await parentDashboard(user, childId);
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const locale = await getLocale();
  const c = d.child;
  const upcomingLabels = await Promise.all(d.upcoming.map((u) => dayLabel(u.at)));
  const canPay = can(user, "invoices.pay");

  return (
    <div className="space-y-5 sm:space-y-6">
      <GreetingHeader name={user.name} subtitle={t("greeting.subtitle.parent")} theme="parent">
        {d.kids.length > 1 ? (
          <ChildSwitcher kids={d.kids} selectedId={c?.id} basePath="/dashboard" onDark />
        ) : (
          d.kids.length === 1 && <AvatarStack people={d.kids} />
        )}
      </GreetingHeader>

      {!c ? (
        <div className="card">
          <EmptyState title={t("parent.noChildren")} description={t("parent.noChildrenHint")} icon={<HeartHandshake className="size-4" />} />
        </div>
      ) : (
        <>
          {/* Selected child hero */}
          <section className="card relative overflow-hidden">
            <div className="absolute inset-y-0 start-0 w-1.5" style={{ background: d.group?.color ?? "#7C4DFF" }} aria-hidden />
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <Avatar firstName={c.firstName} lastName={c.lastName} src={c.photoUrl} size="xl" />
                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-extrabold text-ink">
                    {c.firstName} {c.lastName}
                  </h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {c.dateOfBirth && <Badge tone="neutral">{tc("fields.years", { count: ageFrom(c.dateOfBirth) ?? 0 })}</Badge>}
                    {d.group ? <Badge color={d.group.color}>{d.group.name}</Badge> : <Badge tone="neutral">{t("parent.noGroup")}</Badge>}
                    <StatusBadge status={c.membershipStatus} />
                  </div>
                  {d.group && d.group.monitors.length > 0 && (
                    <p className="mt-2 flex items-center gap-2 text-xs text-muted">
                      <Users className="size-3.5" /> {t("parent.monitors")} : {d.group.monitors.map((m) => `${m.member.firstName} ${m.member.lastName}`).join(", ")}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-3">
                <div className="rounded-2xl bg-sun-soft px-3 py-2 text-center">
                  <p className="flex items-center justify-center gap-1 font-display text-xl font-extrabold text-amber-700">
                    <Star className="size-4" fill="currentColor" /> {c.points}
                  </p>
                  <p className="text-[11px] font-bold text-amber-800/80">{t("kid.points")}</p>
                </div>
                <Link href={`/dashboard/achievements?child=${c.id}`} className="rounded-2xl bg-grape-soft px-3 py-2 text-center hover:brightness-95">
                  <p className="flex items-center justify-center gap-1 font-display text-xl font-extrabold text-violet-700">
                    <Award className="size-4" /> {d.badgeCount}
                  </p>
                  <p className="text-[11px] font-bold text-violet-800/80">{t("parent.seeAchievements")}</p>
                </Link>
                <Link href={`/dashboard/members/${c.id}`} className="grid place-items-center rounded-2xl bg-surface-2 px-3 py-2 text-center text-xs font-bold text-ink-2 hover:bg-line">
                  <ArrowRight className="rtl-flip size-4" />
                  {t("myChildren.openProfile")}
                </Link>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Section title={t("parent.nextSessions")} className="lg:col-span-2" href="/dashboard/calendar" actionLabel={tn("items.calendar")}>
              <AgendaList items={d.sessions} empty={t("parent.noSessions")} />
            </Section>
            <Section title={t("parent.attendance")} href={`/dashboard/members/${c.id}?tab=attendance`} actionLabel={tc("actions.details")}>
              {d.attendance && d.attendance.total ? (
                <>
                <div className="flex items-center gap-5">
                  <Ring value={d.attendance.rate ?? 0} color={rateColor(d.attendance.rate)} size={104}>
                    <span>
                      <span className="block font-display text-2xl font-extrabold text-ink">{d.attendance.rate}%</span>
                      <span className="block text-[10px] font-bold text-muted">
                        {d.attendance.present}/{d.attendance.total}
                      </span>
                    </span>
                  </Ring>
                  <dl className="grid flex-1 grid-cols-2 gap-2 text-center">
                    {(["present", "late", "excused", "absent"] as const).map((k) => (
                      <div key={k} className="rounded-xl bg-surface-2/70 px-2 py-1.5">
                        <dt className="text-[11px] font-bold text-muted">{t(`parent.${k}`)}</dt>
                        <dd className="font-display text-lg font-extrabold text-ink">{k === "present" ? d.attendance!.present - d.attendance!.late : d.attendance![k]}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <p className="mt-5 mb-2 text-xs font-extrabold tracking-wide text-muted uppercase">{t("parent.lastSessions")}</p>
                <ol className="flex flex-wrap gap-1.5">
                  {d.recentAttendance.map((a) => (
                    <li key={a.id} title={`${formatDate(a.date, locale)} · ${tc(`status.${a.status}`)}`} className={cn("grid size-7 place-items-center rounded-lg text-[10px] font-extrabold text-white", ATT_COLORS[a.status] ?? "bg-muted")}>
                      {a.date.getDate()}
                      <span className="sr-only">{tc(`status.${a.status}`)}</span>
                    </li>
                  ))}
                </ol>
                </>
              ) : (
                <p className="rounded-2xl bg-surface-2/60 px-4 py-6 text-center text-sm text-muted">{t("parent.noAttendance")}</p>
              )}
            </Section>
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">{t("parent.upcoming")}</h2>
              <Link href="/dashboard/events" className="text-sm font-bold text-brand-600 hover:text-brand-700">
                {tc("actions.viewAll")}
              </Link>
            </div>
            {d.upcoming.length ? (
              <ScrollStrip cols="sm:grid-cols-2 lg:grid-cols-3">
                {d.upcoming.map((u, i) => (
                  <StripItem key={`${u.kind}-${u.id}`}>
                    <Link href={u.href} className="card card-hover block h-full overflow-hidden">
                      <CoverArt src={u.coverUrl} seed={u.id} color={CATEGORY_COLORS[u.category] ?? "#7C4DFF"} icon={u.kind === "trip" ? <Bus /> : <PartyPopper />} className="h-28">
                        <span className="absolute start-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold text-ink">{t(`kind.${u.kind}`)}</span>
                      </CoverArt>
                      <div className="p-4">
                        <p className="line-clamp-1 font-bold text-ink">{u.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {upcomingLabels[i]} · {hhmm(u.at, locale)} {u.place && `· ${u.place}`}
                        </p>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          {u.registration ? <StatusBadge status={u.registration.status} /> : <Badge tone="neutral">{t("parent.notRegistered")}</Badge>}
                          {!u.registration && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-600">
                              {t("parent.register")} <ArrowRight className="rtl-flip size-3.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </StripItem>
                ))}
              </ScrollStrip>
            ) : (
              <div className="card">
                <EmptyState compact title={t("empty.agenda")} />
              </div>
            )}
          </section>
        </>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {canPay && (
          <Section title={t("parent.payments")} href="/dashboard/finance/invoices" actionLabel={tc("actions.viewAll")}>
            {d.finance.balance > 0 ? (
              <>
                <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-coral p-4 text-white rtl:bg-gradient-to-bl">
                  <p className="text-xs font-bold text-white/85">{t("parent.balance")}</p>
                  <p className="font-display text-3xl font-extrabold tabular-nums">{formatMoney(d.finance.balance, locale)}</p>
                  {c && d.finance.childBalance > 0 && d.kids.length > 1 && <p className="mt-1 text-xs text-white/85">{t("parent.childBalance", { amount: formatMoney(d.finance.childBalance, locale), name: c.firstName })}</p>}
                  {d.finance.overdueCount > 0 && <p className="mt-2 inline-flex rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">{t("parent.overdue", { count: d.finance.overdueCount })}</p>}
                </div>
                <ul className="mt-3 divide-y divide-line">
                  {d.finance.nextDue.map((inv) => (
                    <li key={inv.id}>
                      <Link href={`/dashboard/finance/invoices/${inv.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-brand-700">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-ink">{inv.description}</span>
                          <span className="block text-xs text-muted">{t("parent.dueOn", { date: formatDate(inv.dueDate, locale) })}</span>
                        </span>
                        <span className="text-end">
                          <span className="block text-sm font-extrabold text-ink tabular-nums">{formatMoney(inv.remaining, locale)}</span>
                          <StatusBadge status={inv.status} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <LinkButton href="/dashboard/finance/invoices" className="mt-3 w-full">
                  <Wallet className="size-4" /> {t("parent.payNow")}
                </LinkButton>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-2xl bg-leaf-soft px-4 py-8 text-center">
                <CheckCircle2 className="size-8 text-emerald-600" />
                <p className="font-bold text-emerald-800">{t("parent.allPaid")}</p>
                <Link href="/dashboard/finance/invoices" className="text-xs font-bold text-emerald-700 underline-offset-2 hover:underline">
                  <Receipt className="me-1 inline size-3.5" />
                  {tn("items.invoices")}
                </Link>
              </div>
            )}
          </Section>
        )}
        <div className={cn("grid grid-cols-1 gap-5", canPay ? "lg:col-span-2" : "lg:col-span-3")}>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/dashboard/documents" className="card card-hover flex items-center gap-3 p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sky-soft text-sky-700">
                <FileText className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-bold text-ink">{t("parent.documents")}</span>
                <span className="block truncate text-xs text-muted">{t("parent.documentsHint")}</span>
              </span>
            </Link>
            <Link href="/dashboard/messages" className="card card-hover relative flex items-center gap-3 p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-grape-soft text-violet-700">
                <MessageCircle className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-bold text-ink">{t("parent.messages")}</span>
                <span className={cn("block truncate text-xs", d.unreadMessages ? "font-bold text-brand-600" : "text-muted")}>{t("parent.messagesHint", { count: d.unreadMessages })}</span>
              </span>
              {d.unreadMessages > 0 && <span className="absolute end-3 top-3 size-2.5 rounded-full bg-brand-600" aria-hidden />}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Section title={t("sections.announcements")} href="/dashboard/announcements" actionLabel={tc("actions.viewAll")}>
              <AnnouncementList items={d.announcements} empty={t("empty.announcements")} />
            </Section>
            <Section title={t("sections.notifications")} href="/dashboard/notifications" actionLabel={tc("actions.viewAll")}>
              <NotificationList items={d.notifications} empty={t("empty.notifications")} />
            </Section>
          </div>
        </div>
      </div>
      {c && (
        <div className="flex justify-center">
          <Link href="/dashboard/my-children" className={buttonClasses("outline", "md")}>
            <HeartHandshake className="size-4" /> {tn("items.myChildren")}
          </Link>
        </div>
      )}
    </div>
  );
}

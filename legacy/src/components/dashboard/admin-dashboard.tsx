import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Baby, BadgeDollarSign, Bus, ClipboardCheck, ClipboardList, Coins, FileText, HandCoins, Megaphone, PartyPopper, ShieldCheck, UserPlus, Users, UsersRound, Wallet } from "lucide-react";
import type { CurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/guards";
import { intlLocale, relativeTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { adminDashboard } from "@/server/dashboard/admin";
import { Avatar } from "@/components/ui/avatar";
import { BarsChart, DonutChart, TrendChart } from "@/components/ui/charts";
import { KpiCard } from "@/components/ui/kpi-card";
import { Section } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import { GreetingHeader } from "./greeting-header";
import { AgendaList, NotificationList, QuickAction } from "./widgets";

const FEED_ICONS = { member: { icon: UserPlus, color: "#7C4DFF" }, payment: { icon: Coins, color: "#2BB673" }, report: { icon: FileText, color: "#1E9BD7" }, announcement: { icon: Megaphone, color: "#FF6B4A" } };

export async function AdminDashboard({ user }: { user: CurrentUser }) {
  const d = await adminDashboard(user);
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const locale = await getLocale();
  const month = (date: Date) => new Intl.DateTimeFormat(intlLocale(locale), { month: "short" }).format(date);

  const quick = [
    can(user, "members.manage") && { href: "/dashboard/members/new?type=CHILD", label: t("quick.addChild"), icon: Baby, color: "#FFB400" },
    can(user, "events.manage") && { href: "/dashboard/events/new", label: t("quick.createEvent"), icon: PartyPopper, color: "#E8457C" },
    can(user, "trips.manage") && { href: "/dashboard/trips/new", label: t("quick.createTrip"), icon: Bus, color: "#1E9BD7" },
    can(user, "finance.manage") && { href: "/dashboard/finance/payments", label: t("quick.recordPayment"), icon: HandCoins, color: "#2BB673" },
    can(user, "announcements.manage") && { href: "/dashboard/announcements", label: t("quick.announce"), icon: Megaphone, color: "#FF6B4A" },
    can(user, "attendance.manage") && { href: "/dashboard/attendance", label: t("quick.attendance"), icon: ClipboardCheck, color: "#7C4DFF" },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Baby; color: string }[];

  const secondRow = [
    <KpiCard key="ev" label={t("kpi.upcomingEvents")} value={d.kpis.upcomingEvents} icon={<PartyPopper className="size-5" />} accent="coral" href="/dashboard/events" />,
    <KpiCard key="tr" label={t("kpi.upcomingTrips")} value={d.kpis.upcomingTrips} icon={<Bus className="size-5" />} accent="sky" href="/dashboard/trips" />,
    <KpiCard
      key="reg"
      label={t("kpi.pendingRegistrations")}
      value={d.kpis.pendingRegistrations}
      icon={<ClipboardList className="size-5" />}
      accent="sun"
      hint={d.kpis.pendingJoin ? t("kpi.joinHint", { count: d.kpis.pendingJoin }) : undefined}
      href={can(user, "members.manage") && d.kpis.pendingJoin ? "/dashboard/join-requests" : "/dashboard/registrations"}
    />,
    ...(d.finance
      ? [
          <KpiCard key="rev" label={t("kpi.revenueMonth")} value={formatMoney(d.kpis.revenueMonth, locale)} icon={<Wallet className="size-5" />} accent="leaf" href="/dashboard/finance/payments" />,
          <KpiCard key="pend" label={t("kpi.pendingPayments")} value={formatMoney(d.kpis.pendingAmount, locale)} icon={<BadgeDollarSign className="size-5" />} accent="brand" hint={t("kpi.invoicesHint", { count: d.kpis.pendingInvoices })} href="/dashboard/finance/invoices" />,
        ]
      : []),
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <GreetingHeader name={user.name} subtitle={t("greeting.subtitle.admin")}>
        {d.kpis.pendingJoin > 0 && can(user, "members.manage") && (
          <Link href="/dashboard/join-requests" className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/25">
            <UserPlus className="size-4" /> {t("quick.joinRequests")}
            <span className="rounded-full bg-white px-2 text-xs text-brand-700">{d.kpis.pendingJoin}</span>
          </Link>
        )}
      </GreetingHeader>

      {quick.length > 0 && (
        <section aria-label={t("sections.quickActions")} className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-3 sm:px-0 lg:grid-cols-6">
          {quick.map((q) => (
            <QuickAction key={q.href} {...q} />
          ))}
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard label={t("kpi.members")} value={d.kpis.members} icon={<Users className="size-5" />} accent="brand" href="/dashboard/members" />
        <KpiCard label={t("kpi.children")} value={d.kpis.children} icon={<Baby className="size-5" />} accent="sun" href="/dashboard/children" />
        <KpiCard label={t("kpi.parents")} value={d.kpis.parents} icon={<UsersRound className="size-5" />} accent="grape" href="/dashboard/parents" />
        <KpiCard label={t("kpi.monitors")} value={d.kpis.monitors} icon={<ShieldCheck className="size-5" />} accent="teal" href="/dashboard/monitors" />
      </section>
      <section className={cn("grid grid-cols-2 gap-3 sm:gap-4", secondRow.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-3")}>
        {secondRow.map((c, i) => (
          <div key={i} className={cn(secondRow.length % 2 === 1 && i === secondRow.length - 1 && "col-span-2 lg:col-span-1")}>
            {c}
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {d.trend ? (
          <Section title={<ChartTitle title={t("charts.revenueVsExpenses")} hint={t("charts.sixMonths")} />}>
            <TrendChart
              data={d.trend.map((r) => ({ month: month(r.month), revenue: r.revenue / 1000, expenses: r.expenses / 1000 }))}
              xKey="month"
              series={[
                { key: "revenue", label: t("charts.revenue") },
                { key: "expenses", label: t("charts.expenses"), color: "#E30613" },
              ]}
              format="money"
            />
          </Section>
        ) : (
          <AttendanceSection data={d.attendance} />
        )}
        <Section title={t("charts.membersByGroup")} href="/dashboard/groups" actionLabel={tc("actions.viewAll")}>
          {d.groups.some((g) => g._count.children) ? (
            <DonutChart data={d.groups.map((g) => ({ name: g.name, value: g._count.children }))} centerLabel={t("charts.childrenCenter")} height={190} />
          ) : (
            <p className="py-10 text-center text-sm text-muted">{t("empty.data")}</p>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {d.trend && <AttendanceSection data={d.attendance} />}
        <Section title={t("sections.agenda")} href="/dashboard/calendar" actionLabel={tn("items.calendar")} className={d.trend ? "lg:col-span-2" : "lg:col-span-3"}>
          <AgendaList items={d.agenda} empty={t("empty.agenda")} />
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Section title={t("sections.recentRegistrations")} href="/dashboard/registrations" actionLabel={tc("actions.viewAll")}>
          {d.registrations.length ? (
            <ul className="space-y-1">
              {d.registrations.map((r) => (
                <li key={r.id}>
                  <Link href={r.href} className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-surface-2/60">
                    <Avatar firstName={r.member.firstName} lastName={r.member.lastName} src={r.member.photoUrl} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">
                        {r.member.firstName} {r.member.lastName}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {t(`kind.${r.kind}`)} · {r.title}
                      </span>
                    </span>
                    <StatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted">{t("empty.registrations")}</p>
          )}
        </Section>
        <Section title={t("sections.recentActivity")}>
          {d.feed.length ? (
            <ol className="relative space-y-3 before:absolute before:inset-y-2 before:start-4 before:w-px before:bg-line">
              {d.feed.map((f) => {
                const k = FEED_ICONS[f.kind];
                return (
                  <li key={f.id} className="relative flex gap-3">
                    <span className="relative grid size-8 shrink-0 place-items-center rounded-full text-white ring-4 ring-surface" style={{ background: k.color }}>
                      <k.icon className="size-4" />
                    </span>
                    <Link href={f.href} className="min-w-0 flex-1 rounded-lg hover:text-brand-700">
                      <span className="block text-xs font-bold text-muted">
                        {t(`feed.${f.kind}`)} · {relativeTime(f.at, locale)}
                      </span>
                      <span className="block truncate text-sm font-bold text-ink">{f.title}</span>
                      {f.kind === "member" && f.detail ? (
                        <span className="block text-xs text-muted">{tc(`enums.memberType.${f.detail}`)}</span>
                      ) : f.amount ? (
                        <span className="block text-xs font-bold text-emerald-700">+{formatMoney(f.amount, locale)}</span>
                      ) : f.detail ? (
                        <span className="block truncate text-xs text-muted">{f.detail}</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="py-6 text-center text-sm text-muted">{t("empty.feed")}</p>
          )}
        </Section>
        <Section title={t("sections.notifications")} href="/dashboard/notifications" actionLabel={tc("actions.viewAll")}>
          <NotificationList items={d.notifications} empty={t("empty.notifications")} />
        </Section>
      </div>
    </div>
  );
}

export async function AttendanceSection({ data, className }: { data: { week: Date; rate: number; total: number }[]; className?: string }) {
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const label = (date: Date) => new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short" }).format(date);
  return (
    <Section title={<ChartTitle title={t("charts.attendance")} hint={t("charts.eightWeeks")} />} className={className}>
      {data.some((w) => w.total) ? (
        <BarsChart data={data.map((w) => ({ week: label(w.week), rate: w.rate }))} xKey="week" series={[{ key: "rate", label: t("charts.rate") }]} height={240} />
      ) : (
        <p className="py-10 text-center text-sm text-muted">{t("empty.data")}</p>
      )}
    </Section>
  );
}

export function ChartTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <span className="block">
      {title}
      <span className="block text-xs font-semibold text-muted">{hint}</span>
    </span>
  );
}

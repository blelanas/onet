import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Bell, CheckCheck, Settings2 } from "lucide-react";
import { can, requireUser } from "@/lib/auth/guards";
import { NOTIFICATION_TYPES } from "@/lib/constants";
import { addDays, formatDate, startOfDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { markAllNotificationsRead } from "@/server/communication/notification-actions";
import { listNotifications, roleOptions } from "@/server/communication/notifications";
import { BroadcastButton } from "@/components/communication/broadcast-form";
import { NotificationItem } from "@/components/communication/notification-item";
import { ActionButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination, paging } from "@/components/ui/pagination";
import { FilterSelect } from "@/components/ui/toolbar";

export async function generateMetadata() {
  const t = await getTranslations("communication.notifications");
  return { title: t("title") };
}

type SP = Record<string, string | string[] | undefined>;

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const t = await getTranslations("communication.notifications");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const locale = await getLocale();
  const unreadOnly = sp.filter === "unread";
  const type = typeof sp.type === "string" ? sp.type : undefined;
  const { page, pageSize, skip, take } = paging(sp, 25);
  const canBroadcast = can(user, "notifications.manage");
  const [{ rows, total, unread }, roles] = await Promise.all([listNotifications(user, { unread: unreadOnly, type, skip, take }), canBroadcast ? roleOptions() : Promise.resolve([])]);

  const today = startOfDay();
  const yesterday = addDays(today, -1);
  const groups: { label: string; items: typeof rows }[] = [];
  for (const n of rows) {
    const d = startOfDay(n.createdAt);
    const label = +d === +today ? t("today") : +d === +yesterday ? t("yesterday") : formatDate(d, locale, "long");
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  }

  const tab = (key: string, label: string, href: string, count?: number) => (
    <Link
      href={href}
      scroll={false}
      className={cn("flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold transition", (key === "unread") === unreadOnly ? "bg-ink text-white shadow-sm" : "text-ink-2 hover:bg-surface-2")}
    >
      {label}
      {count ? <span className={cn("rounded-full px-1.5 text-[11px]", (key === "unread") === unreadOnly ? "bg-white/20" : "bg-brand-600 text-white")}>{count}</span> : null}
    </Link>
  );
  const qsType = type ? `type=${type}` : "";

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("unreadCount", { count: unread })}
        icon={<Bell className="size-6" />}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title") }]}
        actions={
          <>
            {unread > 0 && (
              <ActionButton action={markAllNotificationsRead} variant="outline" size="md">
                <CheckCheck className="size-4" /> {tc("actions.markAllRead")}
              </ActionButton>
            )}
            {canBroadcast && <BroadcastButton roles={roles.map((r) => ({ key: r.key, name: r.name, color: r.color, users: r._count.users }))} />}
          </>
        }
      />
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-full border border-line bg-surface p-1">
            {tab("all", t("all"), `/dashboard/notifications${qsType ? `?${qsType}` : ""}`)}
            {tab("unread", t("unreadTab"), `/dashboard/notifications?filter=unread${qsType ? `&${qsType}` : ""}`, unread)}
          </div>
          <FilterSelect param="type" allLabel={t("allTypes")} options={NOTIFICATION_TYPES.map((v) => ({ value: v, label: tc(`enums.notificationType.${v}`) }))} className="ms-auto" />
          {can(user, "settings.manage") && (
            <Link href="/dashboard/settings/notifications" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-700">
              <Settings2 className="size-4" /> {t("channelsLink")}
            </Link>
          )}
        </div>
        {rows.length === 0 ? (
          <div className="card">
            <EmptyState title={unreadOnly ? t("empty.unread") : t("empty.title")} description={t("empty.description")} icon={<Bell className="size-4" />} />
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map((g) => (
              <section key={g.label} className="card p-2 sm:p-3">
                <h2 className="px-2 pt-1 pb-2 text-sm font-extrabold text-ink-2 first-letter:uppercase">{g.label}</h2>
                <ul className="space-y-1">
                  {g.items.map((n) => (
                    <NotificationItem key={n.id} n={n} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
        <Pagination page={page} pageSize={pageSize} total={total} basePath="/dashboard/notifications" searchParams={sp} />
      </div>
    </>
  );
}

import { useLocale, useTranslations } from "use-intl";
import { Bell, CheckCheck, Settings2 } from "lucide-react";
import type { notificationsPage } from "@api/modules/communication/routes";
import { NOTIFICATION_TYPES, addDays, formatDate, startOfDay } from "@onet/shared";
import { cn } from "@/lib/utils";
import { queryClient, useApi } from "@/lib/query";
import { Link, useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { markAllNotificationsRead } from "@/api/communication";
import { QueryView } from "@/components/states/page-state";
import { BroadcastButton } from "@/components/communication/broadcast-form";
import { NotificationItem } from "@/components/communication/notification-item";
import { ActionButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { FilterSelect } from "@/components/ui/toolbar";

type Data = Loaded<typeof notificationsPage>;

/** /dashboard/notifications (?filter=unread, ?type=, ?page=) */
export function Component() {
  const t = useTranslations("communication.notifications");
  usePageTitle(t("title"));
  const sp = useSearchParamsObject();
  const query = useApi<Data>("/notifications", sp);
  return <QueryView query={query}>{(data) => <Notifications data={data} sp={sp} />}</QueryView>;
}

/** Marking read changes the shell's unread badge (served by /auth/me). */
function refreshBadge() {
  return queryClient.invalidateQueries({ queryKey: ["/auth/me"] });
}

function Notifications({ data, sp }: { data: Data; sp: Record<string, string | undefined> }) {
  const t = useTranslations("communication.notifications");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const { rows, total, unread, page, pageSize, canBroadcast, canSettings, roles } = data;
  const unreadOnly = sp.filter === "unread";
  const type = sp.type;

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
              <ActionButton
                action={async () => {
                  const res = await markAllNotificationsRead();
                  if (res.ok) await refreshBadge();
                  return res;
                }}
                variant="outline"
                size="md"
              >
                <CheckCheck className="size-4" /> {tc("actions.markAllRead")}
              </ActionButton>
            )}
            {canBroadcast && <BroadcastButton roles={roles} />}
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
          {canSettings && (
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
                    <NotificationItem key={n.id} n={n} onChanged={refreshBadge} />
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

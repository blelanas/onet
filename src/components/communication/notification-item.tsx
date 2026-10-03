import { getLocale, getTranslations } from "next-intl/server";
import { BadgeCheck, Bell, Bus, CalendarClock, ClipboardCheck, Mail, MailOpen, Megaphone, MessageCircle, PartyPopper, Sparkles, Trash2, Wallet } from "lucide-react";
import { formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { deleteNotification, markNotificationRead, markNotificationUnread } from "@/server/communication/notification-actions";
import { ActionButton } from "@/components/ui/confirm-button";

export const NOTIFICATION_THEME: Record<string, { icon: typeof Bell; color: string }> = {
  EVENT_NEW: { icon: PartyPopper, color: "#7C4DFF" },
  TRIP_REGISTRATION: { icon: Bus, color: "#1E9BD7" },
  PAYMENT_REMINDER: { icon: Wallet, color: "#D98B00" },
  PAYMENT_CONFIRMED: { icon: BadgeCheck, color: "#2BB673" },
  ACTIVITY: { icon: Sparkles, color: "#FF6B4A" },
  EVENT_REMINDER: { icon: CalendarClock, color: "#E8457C" },
  ATTENDANCE: { icon: ClipboardCheck, color: "#00A3A3" },
  MESSAGE: { icon: MessageCircle, color: "#1683C0" },
  ANNOUNCEMENT: { icon: Megaphone, color: "#E30613" },
  SYSTEM: { icon: Bell, color: "#4A4360" },
};

type N = { id: string; type: string; title: string; body: string | null; link: string | null; readAt: Date | null; createdAt: Date };

export async function NotificationItem({ n }: { n: N }) {
  const t = await getTranslations("communication.notifications");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const theme = NOTIFICATION_THEME[n.type] ?? NOTIFICATION_THEME.SYSTEM;
  const Icon = theme.icon;
  const unread = !n.readAt;
  return (
    <li className={cn("group relative flex items-start gap-3 rounded-2xl p-3 transition sm:p-4", unread ? "bg-brand-50/50 hover:bg-brand-50" : "hover:bg-surface-2/70")}>
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl" style={{ background: `${theme.color}1A`, color: theme.color }}>
        <Icon className="size-5" />
      </span>
      <a href={`/dashboard/notifications/open/${n.id}`} className="min-w-0 flex-1 after:absolute after:inset-0 after:rounded-2xl focus:outline-none">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-[11px] font-extrabold tracking-wide uppercase" style={{ color: theme.color }}>
            {tc(`enums.notificationType.${n.type}`)}
          </span>
          <span className="text-[11px] text-muted tabular-nums">{formatTime(n.createdAt, locale)}</span>
        </span>
        <span className={cn("mt-0.5 block text-sm text-ink", unread ? "font-extrabold" : "font-semibold")}>{n.title}</span>
        {n.body && <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{n.body}</span>}
      </a>
      <div className="relative z-10 flex shrink-0 items-center gap-0.5">
        {unread && <span className="me-1 size-2.5 rounded-full bg-brand-600" aria-hidden />}
        <div className="flex opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          {unread ? (
            <ActionButton action={markNotificationRead.bind(null, n.id)} variant="ghost" size="icon-sm" ariaLabel={t("markRead")}>
              <MailOpen className="size-4" />
            </ActionButton>
          ) : (
            <ActionButton action={markNotificationUnread.bind(null, n.id)} variant="ghost" size="icon-sm" ariaLabel={t("markUnread")}>
              <Mail className="size-4" />
            </ActionButton>
          )}
          <ActionButton action={deleteNotification.bind(null, n.id)} variant="ghost" size="icon-sm" successMessage="toast.deleted" ariaLabel={tc("actions.delete")}>
            <Trash2 className="size-4 text-red-600" />
          </ActionButton>
        </div>
      </div>
    </li>
  );
}

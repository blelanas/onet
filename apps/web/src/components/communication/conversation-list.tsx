import { useLocale, useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { formatDate, formatTime, startOfDay } from "@onet/shared";
import { cn } from "@/lib/utils";
import type { messagesPage } from "@api/modules/communication/routes";
import type { Loaded } from "@/lib/types";

export type ConversationSummary = Loaded<typeof messagesPage>["conversations"][number];
import { Avatar } from "@/components/ui/avatar";

export function shortStamp(d: Date, locale: string) {
  return d >= startOfDay() ? formatTime(d, locale) : formatDate(d, locale, "short").slice(0, 5);
}

export function ConversationList({ items, activeId, meId }: { items: ConversationSummary[]; activeId?: string; meId: string }) {
  const t = useTranslations("communication.messages");
  const locale = useLocale();
  return (
    <ul className="space-y-1 p-2">
      {items.map((c) => {
        const name = c.others.map((o) => o.name).join(", ") || "—";
        const active = c.id === activeId;
        return (
          <li key={c.id}>
            <Link
              href={`/dashboard/messages?c=${c.id}`}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn("flex items-center gap-3 rounded-2xl p-2.5 transition", active ? "bg-brand-50 ring-1 ring-brand-100" : "hover:bg-surface-2")}
            >
              <span className="relative">
                <Avatar name={c.others[0]?.name ?? "?"} src={c.others[0]?.avatarUrl} />
                {c.unread > 0 && <span className="absolute -end-0.5 -top-0.5 size-3 rounded-full bg-brand-600 ring-2 ring-surface" aria-hidden />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn("truncate text-sm text-ink", c.unread ? "font-extrabold" : "font-bold")}>{name}</span>
                  <span className={cn("shrink-0 text-[11px] tabular-nums", c.unread ? "font-bold text-brand-600" : "text-muted")}>{shortStamp(c.lastAt, locale)}</span>
                </span>
                {c.subject && <span className="block truncate text-xs font-semibold text-ink-2">{c.subject}</span>}
                <span className="flex items-center justify-between gap-2">
                  <span className={cn("truncate text-xs", c.unread ? "font-semibold text-ink" : "text-muted")}>
                    {c.last ? (c.last.senderId === meId ? t("youSaid", { text: c.last.body }) : c.last.body) : t("noMessagesYet")}
                  </span>
                  {c.unread > 0 && (
                    <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand-600 px-1.5 text-[11px] font-extrabold text-white" aria-label={t("unread", { count: c.unread })}>
                      {c.unread}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

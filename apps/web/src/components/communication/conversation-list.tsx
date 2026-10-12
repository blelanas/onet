import { useLocale, useTranslations } from "use-intl";
import { Flag, Users } from "lucide-react";
import { Link } from "@/lib/router";
import { formatTime, intlLocale, startOfDay } from "@onet/shared";
import { cn } from "@/lib/utils";
import type { allGroupsPage, messagesPage } from "@api/modules/communication/routes";
import type { Loaded } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export type ConversationSummary = Loaded<typeof messagesPage>["conversations"][number];
export type GroupRow = Loaded<typeof allGroupsPage>["rows"][number];

export function shortStamp(d: Date, locale: string) {
  return d >= startOfDay() ? formatTime(d, locale) : new Intl.DateTimeFormat(intlLocale(locale), { day: "2-digit", month: "2-digit" }).format(d);
}

/** Round group avatar (a flag for event-team chats). */
export function GroupIcon({ team, size = "md" }: { team?: boolean; size?: "sm" | "md" }) {
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-full", size === "sm" ? "size-8" : "size-10", team ? "bg-sky-soft text-sky-700" : "bg-brand-50 text-brand-700")} aria-hidden>
      {team ? <Flag className="size-4" /> : <Users className="size-[18px]" />}
    </span>
  );
}

export function ConversationList({ items, activeId, meId }: { items: ConversationSummary[]; activeId?: string; meId: string }) {
  const t = useTranslations("communication.messages");
  const locale = useLocale();
  return (
    <ul className="space-y-1 p-2">
      {items.map((c) => {
        const group = c.kind === "GROUP";
        const name = c.title || "—";
        const active = c.id === activeId;
        const preview = c.last ? (c.last.senderId === meId ? t("youSaid", { text: c.last.body }) : group ? t("lastSender", { name: c.last.senderName.split(" ")[0] ?? "", text: c.last.body }) : c.last.body) : t("noMessagesYet");
        return (
          <li key={c.id}>
            <Link
              href={`/dashboard/messages?c=${c.id}`}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn("flex items-center gap-3 rounded-2xl p-2.5 transition", active ? "bg-brand-50 ring-1 ring-brand-100" : "hover:bg-surface-2")}
            >
              <span className="relative">
                {group ? <GroupIcon team={!!c.team} /> : <Avatar name={c.others[0]?.name ?? "?"} src={c.others[0]?.avatarUrl} />}
                {c.unread > 0 && <span className="absolute -end-0.5 -top-0.5 size-3 rounded-full bg-brand-600 ring-2 ring-surface" aria-hidden />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn("truncate text-sm text-ink", c.unread ? "font-extrabold" : "font-bold")}>{name}</span>
                  <span className={cn("shrink-0 text-[11px] tabular-nums", c.unread ? "font-bold text-brand-600" : "text-muted")}>{shortStamp(c.lastAt, locale)}</span>
                </span>
                {group ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-2">
                    {c.team && (
                      <Badge tone="info" className="py-0 text-[10px]">
                        {t("groups.team")}
                      </Badge>
                    )}
                    <span className="truncate">{c.team ? `${c.team.editionTitle} · ${t("groups.members", { count: c.participantsCount })}` : t("groups.members", { count: c.participantsCount })}</span>
                  </span>
                ) : (
                  c.subject && <span className="block truncate text-xs font-semibold text-ink-2">{c.subject}</span>
                )}
                <span className="flex items-center justify-between gap-2">
                  <span className={cn("truncate text-xs", c.unread ? "font-semibold text-ink" : "text-muted")}>{preview}</span>
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

/** Platform admins: every chat group, to open and manage it. */
export function AllGroupsList({ items, activeId }: { items: GroupRow[]; activeId?: string }) {
  const t = useTranslations("communication.messages");
  const locale = useLocale();
  return (
    <ul className="space-y-1 p-2">
      {items.map((g) => (
        <li key={g.id}>
          <Link
            href={`/dashboard/messages?view=groups&c=${g.id}`}
            scroll={false}
            aria-current={g.id === activeId ? "page" : undefined}
            className={cn("flex items-center gap-3 rounded-2xl p-2.5 transition", g.id === activeId ? "bg-brand-50 ring-1 ring-brand-100" : "hover:bg-surface-2")}
          >
            <GroupIcon team={!!g.team} />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-bold text-ink">{g.title || "—"}</span>
                <span className="shrink-0 text-[11px] text-muted tabular-nums">{shortStamp(g.lastAt, locale)}</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                {g.team && (
                  <Badge tone="info" className="py-0 text-[10px]">
                    {t("groups.team")}
                  </Badge>
                )}
                <span className="truncate">
                  {[t("groups.members", { count: g.participantsCount }), t("groups.messagesCount", { count: g.messagesCount }), g.createdBy && t("groups.createdBy", { name: g.createdBy })].filter(Boolean).join(" · ")}
                </span>
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

import { useLocale, useTranslations } from "use-intl";
import { AlertOctagon, AlertTriangle, CalendarClock, Megaphone, Pin, PinOff, Trash2, Users } from "lucide-react";
import { formatDate, relativeTime } from "@onet/shared";
import { cn } from "@/lib/utils";
import { deleteAnnouncement, togglePin } from "@/api/communication";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ActionButton, ConfirmButton } from "@/components/ui/confirm-button";
import { AnnouncementFormButton } from "./announcement-form";

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  audience: string;
  groupId: string | null;
  priority: string;
  isPinned: boolean;
  publishedAt: Date;
  expiresAt: Date | null;
  group: { id: string; name: string; color: string } | null;
  author: { name: string; avatarUrl: string | null } | null;
};

export const PRIORITY_THEME: Record<string, { color: string; soft: string; text: string; icon: typeof Megaphone }> = {
  NORMAL: { color: "#1E9BD7", soft: "bg-sky-soft", text: "text-sky-700", icon: Megaphone },
  IMPORTANT: { color: "#FFB400", soft: "bg-sun-soft", text: "text-amber-700", icon: AlertTriangle },
  URGENT: { color: "#E30613", soft: "bg-brand-50", text: "text-brand-700", icon: AlertOctagon },
};

export function AnnouncementCard({ a, canManage, groups }: { a: AnnouncementRow; canManage: boolean; groups: { id: string; name: string }[] }) {
  const t = useTranslations("communication.announcements");
  const tc = useTranslations("common");
  const locale = useLocale();
  const theme = PRIORITY_THEME[a.priority] ?? PRIORITY_THEME.NORMAL;
  const Icon = theme.icon;
  const expired = !!a.expiresAt && a.expiresAt <= new Date();

  return (
    <article
      id={`a-${a.id}`}
      className={cn("card relative scroll-mt-24 overflow-hidden ps-1.5 transition", expired && "opacity-70", a.isPinned && "ring-2 ring-offset-0")}
      style={a.isPinned ? ({ "--tw-ring-color": `${theme.color}55` } as React.CSSProperties) : undefined}
    >
      <span className="absolute inset-y-0 start-0 w-1.5" style={{ background: theme.color }} aria-hidden />
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", theme.soft, theme.text)}>
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {a.isPinned && (
                <Badge tone="brand">
                  <Pin className="size-3" /> {t("pinned")}
                </Badge>
              )}
              {a.priority !== "NORMAL" && <Badge color={theme.color}>{tc(`status.${a.priority}`)}</Badge>}
              {a.group ? (
                <Badge color={a.group.color}>
                  <Users className="size-3" /> {a.group.name}
                </Badge>
              ) : (
                <Badge tone="neutral">{tc(`enums.audience.${a.audience}`)}</Badge>
              )}
              {expired && <Badge tone="neutral">{t("expired")}</Badge>}
            </div>
            <h2 dir="auto" className="mt-1.5 text-start text-lg leading-snug font-extrabold text-ink">{a.title}</h2>
          </div>
          {canManage && (
            <div className="-me-1 -mt-1 flex shrink-0 items-center">
              <AnnouncementFormButton initial={a} groups={groups} />
              <ActionButton action={togglePin.bind(null, a.id)} variant="ghost" size="icon-sm" ariaLabel={a.isPinned ? t("unpin") : t("pin")}>
                {a.isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
              </ActionButton>
              <ConfirmButton action={deleteAnnouncement.bind(null, a.id)} size="icon-sm" ariaLabel={tc("actions.delete")} description={t("deleteConfirm")}>
                <Trash2 className="size-4 text-red-600" />
              </ConfirmButton>
            </div>
          )}
        </div>
        <p dir="auto" className="mt-3 text-start text-[15px] leading-relaxed whitespace-pre-line text-ink-2">{a.body}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 text-xs text-muted">
          {a.author && (
            <span className="flex items-center gap-2">
              <Avatar name={a.author.name} src={a.author.avatarUrl} size="xs" />
              <span className="font-semibold text-ink-2">{a.author.name}</span>
            </span>
          )}
          <time dateTime={a.publishedAt.toISOString()} title={formatDate(a.publishedAt, locale, "long")}>
            {relativeTime(a.publishedAt, locale)}
          </time>
          {a.expiresAt && (
            <span className="flex items-center gap-1">
              <CalendarClock className="size-3.5" /> {t("expiresOn", { date: formatDate(a.expiresAt, locale) })}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

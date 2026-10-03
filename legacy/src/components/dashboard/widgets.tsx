import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Bell, Bus, CalendarDays, Megaphone, Pin, PartyPopper, Shapes, Sparkles, type LucideIcon } from "lucide-react";
import { intlLocale, relativeTime, startOfDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { AgendaItem, AnnouncementRow, NotificationRow } from "@/server/dashboard/common";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";

export const KIND_ICONS: Record<AgendaItem["kind"], LucideIcon> = { event: PartyPopper, trip: Bus, activity: Sparkles, group: Shapes, calendar: CalendarDays };

/** 24-hour "HH:mm" (fr-TN otherwise renders 12-hour AM/PM). */
export function hhmm(d: Date | string, locale: string) {
  return new Intl.DateTimeFormat(intlLocale(locale), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(d));
}

/** "Aujourd'hui" / "Demain" / "sam. 10 oct." */
export async function dayLabel(d: Date) {
  const t = await getTranslations("dashboard.time");
  const locale = await getLocale();
  const diff = Math.round((startOfDay(d).getTime() - startOfDay().getTime()) / 86400_000);
  if (diff === 0) return t("today");
  if (diff === 1) return t("tomorrow");
  return new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short", day: "numeric", month: "short" }).format(d);
}

/** Calendar-style date tile (day number + short month). */
export async function DateTile({ date, color = "#E30613", className }: { date: Date; color?: string; className?: string }) {
  const locale = await getLocale();
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(intlLocale(locale), o).format(date);
  return (
    <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl text-center leading-none", className)} style={{ background: `${color}14`, color }}>
      <span>
        <span className="block font-display text-lg font-extrabold">{fmt({ day: "numeric" })}</span>
        <span className="block text-[10px] font-bold uppercase">{fmt({ month: "short" })}</span>
      </span>
    </span>
  );
}

/** Horizontal scroll strip on phones, grid on larger screens. */
export function ScrollStrip({ children, className, cols = "sm:grid-cols-2 lg:grid-cols-3" }: { children: React.ReactNode; className?: string; cols?: string }) {
  return (
    <div className={cn("scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0", cols, className)}>
      {children}
    </div>
  );
}

/** Item wrapper for ScrollStrip children (fixed width on phones). */
export function StripItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("w-[78%] max-w-xs shrink-0 snap-start sm:w-auto sm:max-w-none", className)}>{children}</div>;
}

export async function AgendaList({ items, empty, cta }: { items: (AgendaItem & { extra?: React.ReactNode })[]; empty: string; cta?: (item: AgendaItem) => React.ReactNode }) {
  const t = await getTranslations("dashboard.kind");
  const locale = await getLocale();
  if (!items.length) return <p className="rounded-2xl bg-surface-2/60 px-4 py-6 text-center text-sm text-muted">{empty}</p>;
  const labels = await Promise.all(items.map((i) => dayLabel(i.at)));
  return (
    <ul className="space-y-2">
      {items.map((it, i) => {
        const Icon = KIND_ICONS[it.kind];
        return (
          <li key={it.id} className="group relative flex items-center gap-3 rounded-2xl border border-line p-2.5 pe-3 transition hover:border-transparent hover:shadow-[var(--shadow-soft)]">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl text-white" style={{ background: it.color }}>
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <Link href={it.href} className="block truncate text-sm font-bold text-ink after:absolute after:inset-0 group-hover:text-brand-700">
                {it.title}
              </Link>
              <p className="truncate text-xs text-muted">
                <span className="font-bold text-ink-2">{labels[i]}</span> · {hhmm(it.at, locale)} · {t(it.kind)}
                {it.location && ` · ${it.location}`}
              </p>
            </div>
            {it.extra}
            {cta && <div className="relative z-10 shrink-0">{cta(it)}</div>}
          </li>
        );
      })}
    </ul>
  );
}

export async function AnnouncementList({ items, empty, tone = "default" }: { items: AnnouncementRow[]; empty: string; tone?: "default" | "kid" }) {
  const locale = await getLocale();
  if (!items.length) return <p className="rounded-2xl bg-surface-2/60 px-4 py-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.map((a) => (
        <li key={a.id} className={cn("relative rounded-2xl p-4", tone === "kid" ? "bg-sun-soft" : a.priority === "URGENT" ? "bg-red-50" : a.priority === "IMPORTANT" ? "bg-sun-soft/70" : "bg-surface-2/70")}>
          <div className="flex items-start gap-3">
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", a.priority === "URGENT" ? "bg-red-600 text-white" : tone === "kid" ? "bg-sun text-ink" : "bg-surface text-brand-600 shadow-[var(--shadow-soft)]")}>
              {a.isPinned ? <Pin className="size-4" /> : <Megaphone className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-ink">{a.title}</p>
                {a.priority !== "NORMAL" && tone !== "kid" && <StatusBadge status={a.priority} />}
                {a.group && <Badge color={a.group.color}>{a.group.name}</Badge>}
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-ink-2">{a.body}</p>
              <p className="mt-1.5 text-xs text-muted">{relativeTime(a.publishedAt, locale)}</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export async function NotificationList({ items, empty }: { items: NotificationRow[]; empty: string }) {
  const locale = await getLocale();
  const tc = await getTranslations("common");
  if (!items.length) return <p className="rounded-2xl bg-surface-2/60 px-4 py-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line">
      {items.map((n) => {
        const body = (
          <div className="flex items-start gap-3 py-2.5">
            <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full", n.readAt ? "bg-surface-2 text-muted" : "bg-brand-50 text-brand-600")}>
              <Bell className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("truncate text-sm", n.readAt ? "font-semibold text-ink-2" : "font-bold text-ink")}>{n.title}</p>
              <p className="truncate text-xs text-muted">
                {tc(`enums.notificationType.${n.type}`)} · {relativeTime(n.createdAt, locale)}
              </p>
            </div>
            {!n.readAt && <span className="mt-2 size-2 shrink-0 rounded-full bg-brand-600" aria-hidden />}
          </div>
        );
        return <li key={n.id}>{n.link ? <Link href={n.link} className="block rounded-xl hover:bg-surface-2/50">{body}</Link> : body}</li>;
      })}
    </ul>
  );
}

/** Compact quick-action tile. */
export function QuickAction({ href, label, icon: Icon, color }: { href: string; label: string; icon: LucideIcon; color: string }) {
  return (
    <Link href={href} className="card-hover group flex w-32 shrink-0 flex-col items-start gap-2 rounded-2xl border border-line bg-surface p-3 text-sm font-bold text-ink sm:w-auto sm:flex-row sm:items-center">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl text-white transition group-hover:scale-105" style={{ background: color }}>
        <Icon className="size-4" />
      </span>
      <span className="leading-tight">{label}</span>
    </Link>
  );
}

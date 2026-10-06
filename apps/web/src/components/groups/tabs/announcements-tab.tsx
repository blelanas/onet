import { useLocale, useTranslations } from "use-intl";
import { Megaphone, Pin } from "lucide-react";
import { relativeTime } from "@onet/shared";
import { cn } from "@/lib/utils";
import type { groupAnnouncementsTab } from "@api/modules/groups/routes";
import { useApi } from "@/lib/query";
import type { Loaded } from "@/lib/types";
import { QueryView } from "@/components/states/page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import { TabSkeleton } from "../grid-skeleton";

type Data = Loaded<typeof groupAnnouncementsTab>;

export function AnnouncementsTab({ groupId }: { groupId: string }) {
  const query = useApi<Data>(`/groups/${groupId}/announcements`);
  return <QueryView query={query} skeleton={<TabSkeleton />}>{(data) => <AnnouncementsPanel items={data.items} />}</QueryView>;
}

function AnnouncementsPanel({ items }: { items: Data["items"] }) {
  const t = useTranslations("groups.announcements");
  const locale = useLocale();
  return (
    <Section title={t("title")} href="/dashboard/announcements" actionLabel={t("all")}>
      {items.length ? (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className={cn("rounded-2xl border p-4", a.priority === "URGENT" ? "border-red-200 bg-red-50/50" : a.priority === "IMPORTANT" ? "border-amber-200 bg-sun-soft/40" : "border-line")}>
              <div className="flex flex-wrap items-center gap-2">
                {a.isPinned && <Pin className="size-4 text-brand-600" aria-label={t("pinned")} />}
                <h3 className="font-bold text-ink">{a.title}</h3>
                {a.priority !== "NORMAL" && <StatusBadge status={a.priority} />}
              </div>
              <p className="mt-1.5 text-sm whitespace-pre-line text-ink-2">{a.body}</p>
              <p className="mt-2 text-xs text-muted">
                {a.author?.name && `${a.author.name} · `}
                {relativeTime(a.publishedAt, locale)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState compact title={t("empty")} icon={<Megaphone className="size-4" />} />
      )}
    </Section>
  );
}

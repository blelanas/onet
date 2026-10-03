import { getTranslations } from "next-intl/server";
import { CalendarPlus, PartyPopper } from "lucide-react";
import { can, requirePagePermission } from "@/lib/auth/guards";
import { EVENT_CATEGORIES } from "@/lib/constants";
import { eventTabCounts, familyRegistrationsFor, listEvents, type EventTab } from "@/server/events/queries";
import { canSeeMoney } from "@/server/registrations/queries";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination, paging } from "@/components/ui/pagination";
import { LinkTabs } from "@/components/ui/tabs";
import { FilterChips, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { EventCard } from "@/components/events/event-card";
import { categoryColor } from "@/components/registrations/visuals";

type SP = Record<string, string | string[] | undefined>;

export async function generateMetadata() {
  const t = await getTranslations("events");
  return { title: t("titles.events") };
}

export default async function EventsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePagePermission("events.read");
  const sp = await searchParams;
  const t = await getTranslations("events");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const manage = can(user, "events.manage");
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const tab: EventTab = str("tab") === "past" ? "past" : str("tab") === "drafts" && manage ? "drafts" : "upcoming";
  const { page, pageSize, skip, take } = paging(sp, 12);
  const [{ rows, total }, counts] = await Promise.all([listEvents(user, { tab, category: str("category"), q: str("q"), skip, take }), eventTabCounts(user)]);
  const family = await familyRegistrationsFor(user, rows.map((r) => r.id));
  const showMoney = canSeeMoney(user);

  const keep = new URLSearchParams(Object.entries({ category: str("category"), q: str("q") }).filter(([, v]) => v) as [string, string][]);
  const href = (k: string) => {
    const p = new URLSearchParams(keep);
    if (k !== "upcoming") p.set("tab", k);
    const qs = p.toString();
    return `/dashboard/events${qs ? `?${qs}` : ""}`;
  };
  const tabs = [
    { key: "upcoming", label: t("tabs.upcoming"), href: href("upcoming"), count: counts.upcoming },
    { key: "past", label: t("tabs.past"), href: href("past"), count: counts.past },
    ...(manage ? [{ key: "drafts", label: t("tabs.drafts"), href: href("drafts"), count: counts.drafts }] : []),
  ];

  return (
    <>
      <PageHeader
        icon={<PartyPopper className="size-6" />}
        title={t("titles.events")}
        description={t("descriptions.events")}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.events") }]}
        actions={
          manage && (
            <LinkButton href="/dashboard/events/new">
              <CalendarPlus className="size-4" /> {t("actions.new")}
            </LinkButton>
          )
        }
      />
      <LinkTabs tabs={tabs} active={tab} />
      <Toolbar>
        <SearchBox placeholder={t("searchPlaceholder")} />
      </Toolbar>
      <FilterChips param="category" allLabel={tc("fields.all")} className="mb-5" options={EVENT_CATEGORIES.map((c) => ({ value: c, label: tc(`enums.eventCategory.${c}`), color: categoryColor(c) }))} />
      {rows.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((e, i) => (
            <li key={e.id} className="animate-[var(--animate-fade-up)]" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <EventCard e={e} showMoney={showMoney} family={family[e.id]} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="card">
          <EmptyState
            icon={<PartyPopper className="size-5" />}
            title={str("q") || str("category") ? tc("states.noResults") : t(`empty.${tab}`)}
            description={str("q") || str("category") ? tc("states.noResultsHint") : t("empty.hint")}
            action={manage ? <LinkButton href="/dashboard/events/new">{t("actions.new")}</LinkButton> : undefined}
          />
        </div>
      )}
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/dashboard/events" searchParams={sp} />
    </>
  );
}

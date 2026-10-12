import { useTranslations } from "use-intl";
import { CalendarPlus, Layers, PartyPopper, Plus } from "lucide-react";
import type { eventsPage } from "@api/modules/events/routes";
import type { seriesListPage } from "@api/modules/events/series";
import { EVENT_CATEGORIES } from "@onet/shared";
import { can, useMe } from "@/lib/auth";
import { useApi } from "@/lib/query";
import { useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { RequirePerm } from "@/components/states/guards";
import { QueryView } from "@/components/states/page-state";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { LinkTabs } from "@/components/ui/tabs";
import { FilterChips, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { EventCard } from "@/components/events/event-card";
import { SeriesCard } from "@/components/events/series-card";
import { SeriesFormButton } from "@/components/events/series-form";
import { categoryColor } from "@/components/registrations/visuals";

type Data = Loaded<typeof eventsPage>;
type SeriesData = Loaded<typeof seriesListPage>;

/** /dashboard/events — the programmes (series) as cards, then the other events (outside any series). */
export function Component() {
  const t = useTranslations("events");
  const tn = useTranslations("nav");
  const me = useMe();
  usePageTitle(t("titles.events"));
  const manage = can(me, "events.manage");
  return (
    <RequirePerm perm="events.read">
      <PageHeader
        icon={<PartyPopper className="size-6" />}
        title={t("titles.events")}
        description={t("series.description")}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.events") }]}
        actions={
          manage && (
            <>
              <SeriesFormButton redirect>
                <Plus className="size-4" /> {t("series.new")}
              </SeriesFormButton>
              <LinkButton href="/dashboard/events/new" variant="outline">
                <CalendarPlus className="size-4" /> {t("actions.new")}
              </LinkButton>
            </>
          )
        }
      />
      <SeriesGrid manage={manage} />
      <section className="mt-10" aria-labelledby="other-events">
        <div className="mb-4">
          <h2 id="other-events" className="text-xl font-extrabold text-ink">
            {t("series.others")}
          </h2>
          <p className="text-sm text-muted">{t("series.othersHint")}</p>
        </div>
        <EventsList />
      </section>
    </RequirePerm>
  );
}

function SeriesGrid({ manage }: { manage: boolean }) {
  const t = useTranslations("events.series");
  const sp = useSearchParamsObject();
  const query = useApi<SeriesData>("/series", { inactive: manage && sp.archived ? "1" : undefined });
  return (
    <section aria-labelledby="programmes">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h2 id="programmes" className="text-xl font-extrabold text-ink">
          {t("title")}
        </h2>
        {manage && (
          <LinkButton href={sp.archived ? "/dashboard/events" : "/dashboard/events?archived=1"} variant={sp.archived ? "soft" : "ghost"} size="sm" scroll={false} aria-pressed={!!sp.archived}>
            {t("showArchived")}
          </LinkButton>
        )}
      </div>
      <QueryView query={query} skeleton={<Skeleton className="h-56 rounded-3xl" />}>
        {({ series }) =>
          series.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {series.map((s, i) => (
                <li key={s.id} className="animate-[var(--animate-fade-up)]" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                  <SeriesCard s={s} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="card">
              <EmptyState
                icon={<Layers className="size-5" />}
                title={t("empty")}
                description={manage ? t("emptyHint") : undefined}
                action={
                  manage ? (
                    <SeriesFormButton redirect>
                      <Plus className="size-4" /> {t("new")}
                    </SeriesFormButton>
                  ) : undefined
                }
              />
            </div>
          )
        }
      </QueryView>
    </section>
  );
}

function EventsList() {
  const sp = useSearchParamsObject();
  const query = useApi<Data>("/events", { series: "none", tab: sp.tab, category: sp.category, q: sp.q, page: sp.page });
  return <QueryView query={query}>{(data) => <EventsGrid data={data} sp={sp} />}</QueryView>;
}

function EventsGrid({ data, sp }: { data: Data; sp: Record<string, string | undefined> }) {
  const t = useTranslations("events");
  const tc = useTranslations("common");
  const { rows, total, page, pageSize, counts, family, showMoney, manage, tab } = data;

  const keep = new URLSearchParams(Object.entries({ category: sp.category, q: sp.q, archived: sp.archived }).filter(([, v]) => v) as [string, string][]);
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
            title={sp.q || sp.category ? tc("states.noResults") : t(`empty.${tab}`)}
            description={sp.q || sp.category ? tc("states.noResultsHint") : t("empty.hint")}
            action={manage ? <LinkButton href="/dashboard/events/new">{t("actions.new")}</LinkButton> : undefined}
          />
        </div>
      )}
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/dashboard/events" searchParams={sp} />
    </>
  );
}

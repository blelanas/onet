import { useTranslations } from "use-intl";
import { Bus, Plus } from "lucide-react";
import type { tripsPage } from "@api/modules/trips/routes";
import { TRIP_CATEGORIES } from "@onet/shared";
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
import { LinkTabs } from "@/components/ui/tabs";
import { FilterChips, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { TripCard } from "@/components/trips/trip-card";
import { categoryColor } from "@/components/registrations/visuals";

type Data = Loaded<typeof tripsPage>;

export function Component() {
  const t = useTranslations("trips");
  const tn = useTranslations("nav");
  const me = useMe();
  usePageTitle(t("titles.trips"));
  const manage = can(me, "trips.manage");
  return (
    <RequirePerm perm="trips.read">
      <PageHeader
        icon={<Bus className="size-6" />}
        title={t("titles.trips")}
        description={t("descriptions.trips")}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.trips") }]}
        actions={
          manage && (
            <LinkButton href="/dashboard/trips/new">
              <Plus className="size-4" /> {t("actions.new")}
            </LinkButton>
          )
        }
      />
      <TripsList />
    </RequirePerm>
  );
}

function TripsList() {
  const sp = useSearchParamsObject();
  const query = useApi<Data>("/trips", { tab: sp.tab, category: sp.category, q: sp.q, page: sp.page });
  return <QueryView query={query}>{(data) => <TripsGrid data={data} sp={sp} />}</QueryView>;
}

function TripsGrid({ data, sp }: { data: Data; sp: Record<string, string | undefined> }) {
  const t = useTranslations("trips");
  const tc = useTranslations("common");
  const { rows, total, page, pageSize, counts, family, showMoney, manage, tab } = data;

  const keep = new URLSearchParams(Object.entries({ category: sp.category, q: sp.q }).filter(([, v]) => v) as [string, string][]);
  const href = (k: string) => {
    const p = new URLSearchParams(keep);
    if (k !== "upcoming") p.set("tab", k);
    const qs = p.toString();
    return `/dashboard/trips${qs ? `?${qs}` : ""}`;
  };
  const tabs = [
    { key: "upcoming", label: t("tabs.upcoming"), href: href("upcoming"), count: counts.upcoming },
    ...(counts.supervised ? [{ key: "supervised", label: t("tabs.supervised"), href: href("supervised"), count: counts.supervised }] : []),
    { key: "past", label: t("tabs.past"), href: href("past"), count: counts.past },
    ...(manage ? [{ key: "drafts", label: t("tabs.drafts"), href: href("drafts"), count: counts.drafts }] : []),
  ];

  return (
    <>
      <LinkTabs tabs={tabs} active={tab} />
      <Toolbar>
        <SearchBox placeholder={t("searchPlaceholder")} />
      </Toolbar>
      <FilterChips param="category" allLabel={tc("fields.all")} className="mb-5" options={TRIP_CATEGORIES.map((c) => ({ value: c, label: tc(`enums.tripCategory.${c}`), color: categoryColor(c) }))} />
      {rows.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((trip, i) => (
            <li key={trip.id} className="animate-[var(--animate-fade-up)]" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <TripCard trip={trip} showMoney={showMoney} family={family[trip.id]} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="card">
          <EmptyState
            icon={<Bus className="size-5" />}
            title={sp.q || sp.category ? tc("states.noResults") : t(`empty.${tab}`)}
            description={sp.q || sp.category ? tc("states.noResultsHint") : t("empty.hint")}
            action={manage ? <LinkButton href="/dashboard/trips/new">{t("actions.new")}</LinkButton> : undefined}
          />
        </div>
      )}
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/dashboard/trips" searchParams={sp} />
    </>
  );
}

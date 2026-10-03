import { getTranslations } from "next-intl/server";
import { Bus, Plus } from "lucide-react";
import { can, requirePagePermission } from "@/lib/auth/guards";
import { TRIP_CATEGORIES } from "@/lib/constants";
import { familyTripRegistrations, listTrips, tripTabCounts, type TripTab } from "@/server/trips/queries";
import { canSeeMoney } from "@/server/registrations/queries";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination, paging } from "@/components/ui/pagination";
import { LinkTabs } from "@/components/ui/tabs";
import { FilterChips, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { TripCard } from "@/components/trips/trip-card";
import { categoryColor } from "@/components/registrations/visuals";

type SP = Record<string, string | string[] | undefined>;

export async function generateMetadata() {
  const t = await getTranslations("trips");
  return { title: t("titles.trips") };
}

export default async function TripsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePagePermission("trips.read");
  const sp = await searchParams;
  const t = await getTranslations("trips");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const manage = can(user, "trips.manage");
  const counts = await tripTabCounts(user);
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const requested = str("tab");
  const tab: TripTab = requested === "past" ? "past" : requested === "drafts" && manage ? "drafts" : requested === "supervised" && counts.supervised ? "supervised" : "upcoming";
  const { page, pageSize, skip, take } = paging(sp, 12);
  const { rows, total } = await listTrips(user, { tab, category: str("category"), q: str("q"), skip, take });
  const family = await familyTripRegistrations(user, rows.map((r) => r.id));
  const showMoney = canSeeMoney(user);

  const keep = new URLSearchParams(Object.entries({ category: str("category"), q: str("q") }).filter(([, v]) => v) as [string, string][]);
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
            title={str("q") || str("category") ? tc("states.noResults") : t(`empty.${tab}`)}
            description={str("q") || str("category") ? tc("states.noResultsHint") : t("empty.hint")}
            action={manage ? <LinkButton href="/dashboard/trips/new">{t("actions.new")}</LinkButton> : undefined}
          />
        </div>
      )}
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/dashboard/trips" searchParams={sp} />
    </>
  );
}

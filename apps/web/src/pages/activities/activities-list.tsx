import { useTranslations } from "use-intl";
import { Plus, Sparkles } from "lucide-react";
import type { activitiesPage } from "@api/modules/activities/routes";
import { ACTIVITY_CATEGORIES, ACTIVITY_STATUSES, CATEGORY_COLORS } from "@onet/shared";
import { useMe } from "@/lib/auth";
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
import { FilterChips, FilterSelect, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { ActivityCard } from "@/components/activities/activity-card";
import { CategoryStrip } from "@/components/activities/category-strip";
import { PersonalHero } from "@/components/activities/personal-hero";
import { GridSkeleton } from "@/components/groups/grid-skeleton";

type Data = Loaded<typeof activitiesPage>;
type SP = Record<string, string | undefined>;

export function Component() {
  const t = useTranslations("activities");
  usePageTitle(t("title"));
  return (
    <RequirePerm perm="activities.read">
      <ActivitiesPage />
    </RequirePerm>
  );
}

function ActivitiesPage() {
  const sp = useSearchParamsObject();
  const query = useApi<Data>("/activities", { q: sp.q, category: sp.category, status: sp.status, group: sp.group, mine: sp.mine, page: sp.page });
  return (
    <QueryView query={query} skeleton={<GridSkeleton />}>
      {(data) => (data.view === "manager" ? <ManagerView data={data} sp={sp} /> : <PersonalView data={data} sp={sp} />)}
    </QueryView>
  );
}

function ManagerView({ data, sp }: { data: Extract<Data, { view: "manager" }>; sp: SP }) {
  const user = useMe();
  const t = useTranslations("activities");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const { rows, total, page, pageSize, stats, groups, filtered } = data;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={<Sparkles className="size-6" />}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title") }]}
        actions={
          <LinkButton href="/dashboard/activities/new">
            <Plus className="size-4" /> {t("new")}
          </LinkButton>
        }
      />
      <CategoryStrip counts={stats.byCategory} active={sp.category} sp={sp} />
      <Toolbar className="mt-5">
        <SearchBox placeholder={t("searchPlaceholder")} />
        <FilterSelect param="status" allLabel={t("filters.allStatuses")} options={ACTIVITY_STATUSES.map((s) => ({ value: s, label: tc(`status.${s}`) }))} />
        <FilterSelect param="group" allLabel={t("filters.allGroups")} options={groups.map((g) => ({ value: g.id, label: g.name }))} />
        <FilterChips param="mine" allLabel={t("filters.everything")} options={[{ value: "1", label: t("filters.mine"), color: "#7C4DFF" }]} className="sm:ms-auto" />
      </Toolbar>
      <FilterChips param="category" allLabel={t("filters.allCategories")} options={ACTIVITY_CATEGORIES.map((c) => ({ value: c, label: tc(`enums.activityCategory.${c}`), color: CATEGORY_COLORS[c] }))} className="mb-5" />

      {rows.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {rows.map((a) => (
            <ActivityCard key={a.id} a={a} highlight={user.memberId && a.monitor?.id === user.memberId ? t("card.youLead") : undefined} />
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            title={filtered ? tc("states.noResults") : t("empty.title")}
            description={filtered ? tc("states.noResultsHint") : t("empty.description")}
            icon={<Sparkles className="size-4" />}
            action={
              !filtered ? (
                <LinkButton href="/dashboard/activities/new">
                  <Plus className="size-4" /> {t("new")}
                </LinkButton>
              ) : undefined
            }
          />
        </div>
      )}
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/dashboard/activities" searchParams={sp} />
    </>
  );
}

function PersonalView({ data, sp }: { data: Extract<Data, { view: "personal" }>; sp: SP }) {
  const user = useMe();
  const t = useTranslations("activities");
  const tc = useTranslations("common");
  const isKid = user.roles.includes("kid") && user.roles.length === 1;
  const isParent = user.roles.includes("parent");
  const { mine, rows, total, page, pageSize } = data;

  return (
    <div className="space-y-8">
      <PersonalHero kid={isKid} parent={isParent} name={user.name.split(" ")[0]} count={mine.filter((a) => a.status === "ACTIVE").length} />

      {mine.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-extrabold text-ink">
            <span className="size-2.5 rounded-full bg-brand-600" /> {isKid ? t("personal.mineKid") : isParent ? t("personal.mineParent") : t("personal.mine")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mine.map((a) => (
              <ActivityCard
                key={a.id}
                a={a}
                variant={isKid ? "kid" : "default"}
                highlight={isParent && a.participants.length ? a.participants.map((p) => p.member.firstName).join(", ") : isKid && a.participants.length ? t("personal.enrolled") : undefined}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-extrabold text-ink">
          <span className="size-2.5 rounded-full bg-sun" /> {isKid ? t("personal.discoverKid") : mine.length ? t("personal.discoverMore") : t("personal.discover")}
        </h2>
        <Toolbar>
          <SearchBox placeholder={t("searchPlaceholder")} />
        </Toolbar>
        <FilterChips param="category" allLabel={t("filters.allCategories")} options={ACTIVITY_CATEGORIES.map((c) => ({ value: c, label: tc(`enums.activityCategory.${c}`), color: CATEGORY_COLORS[c] }))} className="mb-5" />
        {rows.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((a) => (
              <ActivityCard key={a.id} a={a} variant={isKid ? "kid" : "default"} />
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState title={tc("states.noResults")} description={tc("states.noResultsHint")} icon={<Sparkles className="size-4" />} />
          </div>
        )}
        <Pagination page={page} pageSize={pageSize} total={total} basePath="/dashboard/activities" searchParams={sp} />
      </section>
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { Plus, Sparkles } from "lucide-react";
import { can, requirePagePermission } from "@/lib/auth/guards";
import type { CurrentUser } from "@/lib/auth/session";
import { ACTIVITY_CATEGORIES, ACTIVITY_STATUSES, CATEGORY_COLORS } from "@/lib/constants";
import { activityStats, listActivities, myActivities } from "@/server/activities/queries";
import { db } from "@/lib/db";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination, paging } from "@/components/ui/pagination";
import { FilterChips, FilterSelect, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { ActivityCard } from "@/components/activities/activity-card";
import { CategoryStrip } from "@/components/activities/category-strip";
import { PersonalHero } from "@/components/activities/personal-hero";

type SP = Record<string, string | string[] | undefined>;

export async function generateMetadata() {
  const t = await getTranslations("activities");
  return { title: t("title") };
}

export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePagePermission("activities.read");
  const sp = await searchParams;
  return can(user, "activities.manage") ? <ManagerView user={user} sp={sp} /> : <PersonalView user={user} sp={sp} />;
}

const str = (sp: SP, k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

async function ManagerView({ user, sp }: { user: CurrentUser; sp: SP }) {
  const t = await getTranslations("activities");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const { page, pageSize, skip, take } = paging(sp, 12);
  const filters = { q: str(sp, "q"), category: str(sp, "category"), status: str(sp, "status"), groupId: str(sp, "group"), mine: str(sp, "mine") === "1" };
  const [{ rows, total }, stats, groups] = await Promise.all([listActivities(user, { ...filters, skip, take }), activityStats(user), db.group.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } })]);
  const filtered = Object.values(filters).some(Boolean);

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
      <CategoryStrip counts={stats.byCategory} active={filters.category} sp={sp} />
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

async function PersonalView({ user, sp }: { user: CurrentUser; sp: SP }) {
  const t = await getTranslations("activities");
  const tc = await getTranslations("common");
  const isKid = user.roles.includes("kid") && user.roles.length === 1;
  const isParent = user.roles.includes("parent");
  const { page, pageSize, skip, take } = paging(sp, 9);
  const filters = { q: str(sp, "q"), category: str(sp, "category") };
  const mine = await myActivities(user);
  const { rows, total } = await listActivities(user, { ...filters, excludeIds: mine.map((a) => a.id), skip, take });

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
              <ActivityCard key={a.id} a={a} variant={isKid ? "kid" : "default"} highlight={isParent && a.participants.length ? a.participants.map((p) => p.member.firstName).join(", ") : isKid && a.participants.length ? t("personal.enrolled") : undefined} />
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

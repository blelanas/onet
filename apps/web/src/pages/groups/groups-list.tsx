import { useTranslations } from "use-intl";
import { Baby, Plus, Shapes, ShieldCheck, Users } from "lucide-react";
import type { groupsPage } from "@api/modules/groups/routes";
import { can, useMe } from "@/lib/auth";
import { useApi } from "@/lib/query";
import { useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { RequirePerm } from "@/components/states/guards";
import { QueryView } from "@/components/states/page-state";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { FilterChips, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { GroupCard } from "@/components/groups/group-card";
import { GridSkeleton } from "@/components/groups/grid-skeleton";

type Data = Loaded<typeof groupsPage>;

export function Component() {
  const t = useTranslations("groups");
  usePageTitle(t("title"));
  return (
    <RequirePerm perm="groups.read">
      <GroupsPage />
    </RequirePerm>
  );
}

function GroupsPage() {
  const sp = useSearchParamsObject();
  const query = useApi<Data>("/groups", { q: sp.q, status: sp.status });
  return <QueryView query={query} skeleton={<GridSkeleton kpis={4} />}>{(data) => <GroupsView data={data} sp={sp} />}</QueryView>;
}

function GroupsView({ data, sp }: { data: Data; sp: Record<string, string | undefined> }) {
  const user = useMe();
  const t = useTranslations("groups");
  const tn = useTranslations("nav");
  const canManage = can(user, "groups.manage");
  const { groups, mine, all } = data;

  const kids = groups.reduce((s, g) => s + g._count.children, 0);
  const capacity = groups.filter((g) => g.isActive).reduce((s, g) => s + g.capacity, 0);
  const monitors = new Set(groups.flatMap((g) => g.monitors.map((m) => m.memberId))).size;

  return (
    <>
      <PageHeader
        title={all ? t("title") : t("titleMine")}
        description={all ? t("description") : t("descriptionMine")}
        icon={<Shapes className="size-6" />}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title") }]}
        actions={
          canManage ? (
            <LinkButton href="/dashboard/groups/new">
              <Plus className="size-4" /> {t("new")}
            </LinkButton>
          ) : undefined
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard label={t("kpi.groups")} value={groups.filter((g) => g.isActive).length} icon={<Shapes className="size-5" />} accent="grape" />
        <KpiCard label={t("kpi.children")} value={kids} icon={<Baby className="size-5" />} accent="sun" />
        <KpiCard label={t("kpi.fill")} value={capacity ? `${Math.round((kids / capacity) * 100)}%` : "—"} icon={<Users className="size-5" />} accent="leaf" hint={t("kpi.fillHint", { capacity })} />
        <KpiCard label={t("kpi.monitors")} value={monitors} icon={<ShieldCheck className="size-5" />} accent="sky" />
      </div>

      <Toolbar>
        <SearchBox placeholder={t("searchPlaceholder")} />
        <FilterChips
          param="status"
          allLabel={t("filters.all")}
          options={[
            { value: "active", label: t("filters.active"), color: "#2BB673" },
            { value: "inactive", label: t("filters.inactive"), color: "#64748B" },
          ]}
        />
      </Toolbar>

      {groups.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((g, i) => (
            <div key={g.id} className="animate-[var(--animate-fade-up)]" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <GroupCard g={g} mine={all && mine.includes(g.id)} />
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            title={sp.q || sp.status ? t("empty.filtered") : all ? t("empty.title") : t("empty.mine")}
            description={canManage ? t("empty.description") : undefined}
            icon={<Shapes className="size-4" />}
            action={
              canManage ? (
                <LinkButton href="/dashboard/groups/new">
                  <Plus className="size-4" /> {t("new")}
                </LinkButton>
              ) : undefined
            }
          />
        </div>
      )}
    </>
  );
}

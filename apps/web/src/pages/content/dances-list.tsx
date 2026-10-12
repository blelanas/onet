import { useTranslations } from "use-intl";
import { Footprints, Plus } from "lucide-react";
import type { dancesPage } from "@api/modules/content/routes";
import { AGE_GROUPS, DANCE_CATEGORIES } from "@onet/shared";
import { useApi } from "@/lib/query";
import { Link, useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { QueryView } from "@/components/states/page-state";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { FilterChips, FilterSelect, SearchBox } from "@/components/ui/toolbar";
import { ContentHero } from "@/components/content/shared/content-hero";
import { DanceCard } from "@/components/content/dances/dance-card";
import { DANCE_COLORS } from "@/components/content/dances/dance-meta";

type Data = Loaded<typeof dancesPage>;

/** /dashboard/content/dances (?q, ?category, ?ageGroup) */
export function Component() {
  const t = useTranslations("content.dances");
  usePageTitle(t("title"));
  const params = useSearchParamsObject();
  const query = useApi<Data>("/content/dances", params);
  return <QueryView query={query}>{(data) => <DancesPage data={data} params={params} />}</QueryView>;
}

function DancesPage({ data, params }: { data: Data; params: Record<string, string | undefined> }) {
  const t = useTranslations("content");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const { rows, total, page, pageSize, filtered, canManage } = data;

  return (
    <>
      <ContentHero
        theme="dances"
        icon={<Footprints />}
        eyebrow={tn("sections.baggage")}
        title={t("dances.title")}
        description={t("dances.description")}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("dances.title") }]}
        actions={
          canManage && (
            <LinkButton href="/dashboard/content/dances/new" className="h-11 rounded-full bg-white text-ink shadow-lg hover:bg-white/90">
              <Plus className="size-4" /> {t("dances.new")}
            </LinkButton>
          )
        }
      />

      <FilterChips
        param="category"
        allLabel={t("common.allCategories")}
        options={DANCE_CATEGORIES.map((c) => ({ value: c, label: tc(`enums.DANCE_CATEGORIES.${c}`), color: DANCE_COLORS[c] }))}
        className="mb-3"
      />
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchBox placeholder={t("dances.searchPlaceholder")} className="sm:max-w-sm" />
        <FilterSelect param="ageGroup" allLabel={t("common.allAges")} label={t("dances.ageGroup")} options={AGE_GROUPS.map((a) => ({ value: a, label: tc(`enums.ageGroup.${a}`) }))} className="min-w-0 sm:w-48" />
        <p className="text-sm font-bold text-muted sm:ms-auto">{t("dances.results", { count: total })}</p>
      </div>

      {rows.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {rows.map((d) => (
            <DanceCard key={d.id} dance={d} />
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={<Footprints className="size-4" />}
            title={filtered ? t("common.emptyFiltered") : t("dances.emptyTitle")}
            description={filtered ? tc("states.noResultsHint") : t("dances.emptyText")}
            action={
              filtered ? (
                <Link href="/dashboard/content/dances" className="font-bold text-brand-600">
                  {t("common.resetFilters")}
                </Link>
              ) : canManage ? (
                <LinkButton href="/dashboard/content/dances/new">
                  <Plus className="size-4" /> {t("dances.new")}
                </LinkButton>
              ) : undefined
            }
          />
        </div>
      )}
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/dashboard/content/dances" searchParams={params} />
    </>
  );
}

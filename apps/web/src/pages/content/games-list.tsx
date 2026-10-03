import { useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { Gamepad2, Plus } from "lucide-react";
import type { gamesPage } from "@api/modules/content/routes";
import { useApi } from "@/lib/query";
import { useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { AGE_GROUPS, CATEGORY_COLORS, GAME_CATEGORIES } from "@onet/shared";
import { QueryView } from "@/components/states/page-state";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { FilterChips, FilterSelect, SearchBox } from "@/components/ui/toolbar";
import { ContentHero } from "@/components/content/shared/content-hero";
import { GameCard } from "@/components/content/games/game-card";

const GAME_PLAYER_OPTIONS = [2, 5, 10, 20, 30] as const;
const GAME_DURATIONS = ["short", "medium", "long"] as const;

type Data = Loaded<typeof gamesPage>;

/** /dashboard/content/games */
export function Component() {
  const t = useTranslations("content.games");
  usePageTitle(t("title"));
  const params = useSearchParamsObject();
  const query = useApi<Data>("/content/games", params);
  return <QueryView query={query}>{(data) => <GamesPage data={data} params={params} />}</QueryView>;
}

function GamesPage({ data, params }: { data: Data; params: Record<string, string | undefined> }) {
  const t = useTranslations("content");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const { rows, total, page, pageSize, filtered, canManage } = data;

  return (
    <>
      <ContentHero
        theme="games"
        icon={<Gamepad2 />}
        eyebrow={tn("sections.content")}
        title={t("games.title")}
        description={t("games.description")}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("games.title") }]}
        actions={
          canManage && (
            <LinkButton href="/dashboard/content/games/new" className="h-11 rounded-full bg-white text-ink shadow-lg hover:bg-white/90">
              <Plus className="size-4" /> {t("games.new")}
            </LinkButton>
          )
        }
      />

      <FilterChips
        param="category"
        allLabel={t("common.allCategories")}
        options={GAME_CATEGORIES.map((c) => ({ value: c, label: tc(`enums.gameCategory.${c}`), color: CATEGORY_COLORS[c] }))}
        className="mb-3"
      />
      <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-center">
        <SearchBox placeholder={t("games.searchPlaceholder")} className="lg:max-w-sm" />
        <div className="grid grid-cols-3 gap-2 sm:flex">
          <FilterSelect param="age" allLabel={t("common.allAges")} label={t("games.ageGroup")} options={AGE_GROUPS.map((a) => ({ value: a, label: tc(`enums.ageGroup.${a}`) }))} className="min-w-0" />
          <FilterSelect param="players" allLabel={t("games.anyPlayers")} label={t("games.playersFilter")} options={GAME_PLAYER_OPTIONS.map((n) => ({ value: String(n), label: t("games.playersOption", { count: n }) }))} className="min-w-0" />
          <FilterSelect param="duration" allLabel={t("games.anyDuration")} label={t("games.durationFilter")} options={GAME_DURATIONS.map((d) => ({ value: d, label: t(`games.durations.${d}`) }))} className="min-w-0" />
        </div>
        <p className="text-sm font-bold text-muted lg:ms-auto">{t("games.results", { count: total })}</p>
      </div>

      {rows.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {rows.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={<Gamepad2 className="size-4" />}
            title={filtered ? t("common.emptyFiltered") : t("games.emptyTitle")}
            description={filtered ? tc("states.noResultsHint") : t("games.emptyText")}
            action={
              filtered ? (
                <Link href="/dashboard/content/games" className="font-bold text-brand-600">{t("common.resetFilters")}</Link>
              ) : canManage ? (
                <LinkButton href="/dashboard/content/games/new"><Plus className="size-4" /> {t("games.new")}</LinkButton>
              ) : undefined
            }
          />
        </div>
      )}
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/dashboard/content/games" searchParams={params} />
    </>
  );
}

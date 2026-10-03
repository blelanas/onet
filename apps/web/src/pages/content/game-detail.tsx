import { useTranslations } from "use-intl";
import { Edit, Lightbulb, ListChecks, MonitorPlay, Package, Trash2, Video } from "lucide-react";
import type { gamePage } from "@api/modules/content/routes";
import { useApi } from "@/lib/query";
import { useParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { CATEGORY_COLORS } from "@onet/shared";
import { deleteGame } from "@/api/content";
import { QueryView } from "@/components/states/page-state";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CoverArt } from "@/components/ui/cover-art";
import { Breadcrumbs } from "@/components/ui/page-header";
import { AGE_ICONS, Clock, GameIcon, MetaChip, Users, playersLabel } from "@/components/content/games/game-meta";
import { MaterialsChecklist } from "@/components/content/games/materials-checklist";
import { VideoEmbed } from "@/components/content/shared/video-embed";

type Data = Loaded<typeof gamePage>;

/** /dashboard/content/games/:id */
export function Component() {
  const { id } = useParams();
  const query = useApi<Data>(`/content/games/${id}`);
  usePageTitle(query.data?.game.name);
  return <QueryView query={query}>{(data) => <GamePage key={data.game.id} data={data} />}</QueryView>;
}

function GamePage({ data }: { data: Data }) {
  const { game, steps, materials, canManage } = data;
  const t = useTranslations("content");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const color = CATEGORY_COLORS[game.category] ?? "#E30613";
  const AgeIcon = AGE_ICONS[game.ageGroup] ?? AGE_ICONS.ALL;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("games.title"), href: "/dashboard/content/games" }, { label: game.name }]} />

      <section className="card overflow-hidden">
        <div className="grid md:grid-cols-5">
          <CoverArt src={game.imageUrl} seed={game.id} color={color} icon={<GameIcon category={game.category} />} className="aspect-[16/10] md:col-span-2 md:aspect-auto md:min-h-72" />
          <div className="flex flex-col justify-center gap-3 p-5 sm:p-7 md:col-span-3">
            <div className="flex flex-wrap gap-1.5">
              <Badge color={color}>{tc(`enums.gameCategory.${game.category}`)}</Badge>
              {canManage && <Badge tone={game.isPublic ? "success" : "neutral"}>{game.isPublic ? t("common.publicBadge") : t("common.privateBadge")}</Badge>}
            </div>
            <h1 dir="auto" className="ltr:text-left rtl:text-right text-3xl leading-tight font-extrabold text-ink sm:text-4xl">{game.name}</h1>
            <p dir="auto" className="ltr:text-left rtl:text-right text-base text-ink-2">{game.description}</p>
            <div className="flex flex-wrap gap-2">
              <MetaChip icon={Users} color={color} className="px-3 py-1.5 text-sm">
                {playersLabel(t, game.minPlayers, game.maxPlayers)}
              </MetaChip>
              <MetaChip icon={Clock} className="px-3 py-1.5 text-sm">
                {t("common.minutes", { count: game.durationMin })}
              </MetaChip>
              <MetaChip icon={AgeIcon} className="px-3 py-1.5 text-sm">
                {tc(`enums.ageGroup.${game.ageGroup}`)}
              </MetaChip>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <LinkButton href={`/dashboard/content/games/${game.id}/animate`} size="lg" className="rounded-full" title={t("games.animateHint")}>
                <MonitorPlay className="size-5" /> {t("games.animate")}
              </LinkButton>
              {canManage && (
                <>
                  <LinkButton href={`/dashboard/content/games/${game.id}/edit`} variant="outline" size="lg" className="rounded-full">
                    <Edit className="size-4" /> {tc("actions.edit")}
                  </LinkButton>
                  <ConfirmButton action={() => deleteGame(game.id)} variant="outline" size="lg" className="rounded-full text-red-600" title={t("common.deleteTitle")} description={t("common.deleteText")} confirmLabel={tc("actions.delete")} redirectTo="/dashboard/content/games" ariaLabel={tc("actions.delete")}>
                    <Trash2 className="size-4" />
                  </ConfirmButton>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {steps.length > 0 && (
            <section className="card p-5 sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-ink">
                <ListChecks className="size-5" style={{ color }} /> {t("games.rules")}
              </h2>
              <ol className="space-y-3">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-2xl text-base font-extrabold text-white shadow-sm" style={{ background: color }}>
                      {i + 1}
                    </span>
                    <p dir="auto" className="ltr:text-left rtl:text-right pt-1.5 text-base leading-relaxed text-ink">{s}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {game.instructions && (
            <section className="rounded-2xl border border-amber-200/70 bg-sun-soft p-5 sm:p-6">
              <h2 className="mb-2 flex items-center gap-2 text-lg font-extrabold text-amber-800">
                <Lightbulb className="size-5" /> {t("games.instructions")}
              </h2>
              <p dir="auto" className="ltr:text-left rtl:text-right leading-relaxed whitespace-pre-line text-amber-950/80">{game.instructions}</p>
            </section>
          )}
          {game.videoUrl && (
            <section className="card p-5 sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-ink">
                <Video className="size-5" style={{ color }} /> {t("games.video")}
              </h2>
              <VideoEmbed url={game.videoUrl} title={game.name} openLabel={t("games.openVideo")} />
            </section>
          )}
        </div>
        <aside className="min-w-0 space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-ink">
              <Package className="size-5" style={{ color }} /> {t("games.materials")}
            </h2>
            {materials.length ? <MaterialsChecklist items={materials} color={color} /> : <p className="rounded-xl bg-leaf-soft p-3 text-sm font-bold text-emerald-800">{t("games.noMaterials")}</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}

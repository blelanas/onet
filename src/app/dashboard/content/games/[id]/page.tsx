import { getTranslations } from "next-intl/server";
import { Edit, Lightbulb, ListChecks, MonitorPlay, Package, Trash2, Video } from "lucide-react";
import { can, pageQuery, requirePagePermission } from "@/lib/auth/guards";
import { CATEGORY_COLORS } from "@/lib/constants";
import { getGame, materialItems, ruleSteps } from "@/server/content/games";
import { deleteGame } from "@/server/content/game-actions";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CoverArt } from "@/components/ui/cover-art";
import { Breadcrumbs } from "@/components/ui/page-header";
import { AGE_ICONS, Clock, GameIcon, MetaChip, Users, playersLabel } from "@/components/content/games/game-meta";
import { MaterialsChecklist } from "@/components/content/games/materials-checklist";
import { VideoEmbed } from "@/components/content/shared/video-embed";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    return { title: (await getGame(id)).name };
  } catch {
    return {};
  }
}

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("content.read");
  const { id } = await params;
  const game = await pageQuery(getGame(id));
  const t = await getTranslations("content");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const canManage = can(user, "content.manage");
  const color = CATEGORY_COLORS[game.category] ?? "#E30613";
  const steps = ruleSteps(game.rules);
  const materials = materialItems(game.materials);
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
                  <ConfirmButton action={deleteGame.bind(null, game.id)} variant="outline" size="lg" className="rounded-full text-red-600" title={t("common.deleteTitle")} description={t("common.deleteText")} confirmLabel={tc("actions.delete")} redirectTo="/dashboard/content/games" ariaLabel={tc("actions.delete")}>
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

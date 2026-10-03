import { getTranslations } from "next-intl/server";
import { ArrowLeft, Package } from "lucide-react";
import { pageQuery, requirePagePermission } from "@/lib/auth/guards";
import { CATEGORY_COLORS } from "@/lib/constants";
import { getGame, materialItems, ruleSteps } from "@/server/content/games";
import { LinkButton } from "@/components/ui/button";
import { AnimationStage } from "@/components/content/games/animation-stage";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("content.games");
  try {
    return { title: `${t("animate")} · ${(await getGame(id)).name}` };
  } catch {
    return { title: t("animate") };
  }
}

/** Big-screen view for monitors running the game. */
export default async function AnimateGamePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("content.read");
  const { id } = await params;
  const game = await pageQuery(getGame(id));
  const t = await getTranslations("content");
  const color = CATEGORY_COLORS[game.category] ?? "#E30613";
  const steps = ruleSteps(game.rules);
  const materials = materialItems(game.materials);

  return (
    <div className="space-y-4">
      <LinkButton href={`/dashboard/content/games/${game.id}`} variant="ghost" size="sm">
        <ArrowLeft className="rtl-flip size-4" /> {game.name}
      </LinkButton>
      <AnimationStage minutes={game.durationMin} color={color} title={game.name}>
        <h2 className="mb-4 text-2xl font-extrabold text-white sm:text-3xl">{t("games.rules")}</h2>
        {steps.length ? (
          <ol className="space-y-4">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl text-xl font-extrabold text-white" style={{ background: color }}>
                  {i + 1}
                </span>
                <p dir="auto" className="ltr:text-left rtl:text-right pt-1 text-xl leading-relaxed font-semibold text-white/95 sm:text-2xl">{s}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p dir="auto" className="ltr:text-left rtl:text-right text-xl leading-relaxed text-white/90 sm:text-2xl">{game.description}</p>
        )}
        {materials.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl bg-white/5 p-4">
            <Package className="size-5 text-white/60" />
            {materials.map((m) => (
              <span key={m} className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-white/90">
                {m}
              </span>
            ))}
          </div>
        )}
      </AnimationStage>
    </div>
  );
}

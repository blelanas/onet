import { useTranslations } from "use-intl";
import { ArrowLeft, Package } from "lucide-react";
import type { gamePage } from "@api/modules/content/routes";
import { useApi } from "@/lib/query";
import { useParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { CATEGORY_COLORS } from "@onet/shared";
import { QueryView } from "@/components/states/page-state";
import { LinkButton } from "@/components/ui/button";
import { AnimationStage } from "@/components/content/games/animation-stage";

type Data = Loaded<typeof gamePage>;

/** /dashboard/content/games/:id/animate — big-screen view for monitors running the game. */
export function Component() {
  const { id } = useParams();
  const query = useApi<Data>(`/content/games/${id}`);
  const t = useTranslations("content.games");
  usePageTitle(query.data ? `${t("animate")} · ${query.data.game.name}` : t("animate"));
  return <QueryView query={query}>{(data) => <AnimatePage key={data.game.id} data={data} />}</QueryView>;
}

function AnimatePage({ data }: { data: Data }) {
  const { game, steps, materials } = data;
  const t = useTranslations("content");
  const color = CATEGORY_COLORS[game.category] ?? "#E30613";

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

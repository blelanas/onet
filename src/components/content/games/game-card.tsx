import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CATEGORY_COLORS } from "@/lib/constants";
import { CoverArt } from "@/components/ui/cover-art";
import { AGE_ICONS, Clock, GameIcon, MetaChip, Users, playersLabel } from "./game-meta";

type GameRow = { id: string; name: string; description: string; category: string; ageGroup: string; minPlayers: number; maxPlayers: number | null; durationMin: number; imageUrl: string | null };

/** Playful game card: colored cover by category, then players / duration / age chips. */
export async function GameCard({ game }: { game: GameRow }) {
  const t = await getTranslations("content");
  const tc = await getTranslations("common");
  const color = CATEGORY_COLORS[game.category] ?? "#E30613";
  const AgeIcon = AGE_ICONS[game.ageGroup] ?? AGE_ICONS.ALL;
  return (
    <Link href={`/dashboard/content/games/${game.id}`} className="card card-hover group flex animate-[var(--animate-fade-up)] flex-col overflow-hidden">
      <CoverArt src={game.imageUrl} seed={game.id} color={color} icon={<GameIcon category={game.category} />} className="aspect-[16/9]">
        <span className="absolute start-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-extrabold shadow-sm" style={{ color }}>
          {tc(`enums.gameCategory.${game.category}`)}
        </span>
        <span className="absolute end-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-black/30 px-2.5 py-1 text-xs font-extrabold text-white backdrop-blur-sm">
          <Clock className="size-3.5" /> {t("common.minutes", { count: game.durationMin })}
        </span>
      </CoverArt>
      <div className="flex flex-1 flex-col p-4">
        <h3 dir="auto" className="ltr:text-left rtl:text-right text-lg leading-snug font-extrabold text-ink group-hover:text-brand-700">{game.name}</h3>
        <p dir="auto" className="mt-1 line-clamp-2 flex-1 ltr:text-left rtl:text-right text-sm text-muted">{game.description}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <MetaChip icon={Users} color={color}>
            {playersLabel(t, game.minPlayers, game.maxPlayers)}
          </MetaChip>
          <MetaChip icon={AgeIcon}>{tc(`enums.ageGroup.${game.ageGroup}`)}</MetaChip>
        </div>
      </div>
    </Link>
  );
}

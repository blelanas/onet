import { useTranslations } from "use-intl";
import { Music, Video } from "lucide-react";
import { Link } from "@/lib/router";
import { CoverArt } from "@/components/ui/cover-art";
import { AGE_ICONS, Clock, MetaChip } from "@/components/content/games/game-meta";
import { DanceIcon, danceColor } from "./dance-meta";

type DanceRow = { id: string; title: string; description: string | null; category: string; ageGroup: string; durationMin: number | null; imageUrl: string | null; audioUrl: string | null; videoUrl: string | null };

/** Dance card: coloured cover by category, then age / music / video chips. */
export function DanceCard({ dance }: { dance: DanceRow }) {
  const t = useTranslations("content");
  const tc = useTranslations("common");
  const color = danceColor(dance.category);
  const AgeIcon = AGE_ICONS[dance.ageGroup] ?? AGE_ICONS.ALL;
  return (
    <Link href={`/dashboard/content/dances/${dance.id}`} className="card card-hover group flex animate-[var(--animate-fade-up)] flex-col overflow-hidden" data-testid="dance-card">
      <CoverArt src={dance.imageUrl} seed={dance.id} color={color} icon={<DanceIcon category={dance.category} />} className="aspect-[16/9]">
        <span className="absolute start-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-extrabold shadow-sm" style={{ color }}>
          {tc(`enums.DANCE_CATEGORIES.${dance.category}`)}
        </span>
        {dance.durationMin != null && (
          <span className="absolute end-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-black/30 px-2.5 py-1 text-xs font-extrabold text-white backdrop-blur-sm">
            <Clock className="size-3.5" /> {t("common.minutes", { count: dance.durationMin })}
          </span>
        )}
      </CoverArt>
      <div className="flex flex-1 flex-col p-4">
        <h3 dir="auto" className="text-lg leading-snug font-extrabold text-ink group-hover:text-brand-700 ltr:text-left rtl:text-right">
          {dance.title}
        </h3>
        {dance.description && (
          <p dir="auto" className="mt-1 line-clamp-2 flex-1 text-sm text-muted ltr:text-left rtl:text-right">
            {dance.description}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <MetaChip icon={AgeIcon}>{tc(`enums.ageGroup.${dance.ageGroup}`)}</MetaChip>
          {dance.audioUrl && (
            <MetaChip icon={Music} color={color}>
              {t("dances.hasMusic")}
            </MetaChip>
          )}
          {dance.videoUrl && <MetaChip icon={Video}>{t("dances.hasVideo")}</MetaChip>}
        </div>
      </div>
    </Link>
  );
}

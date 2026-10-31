import { useTranslations } from "use-intl";
import { Edit, Footprints, Music, Trash2, Video } from "lucide-react";
import type { dancePage } from "@api/modules/content/routes";
import { useApi } from "@/lib/query";
import { useParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { deleteDance } from "@/api/content";
import { QueryView } from "@/components/states/page-state";
import { AudioPlayer } from "@/components/ui/audio-player";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CoverArt } from "@/components/ui/cover-art";
import { Breadcrumbs } from "@/components/ui/page-header";
import { AGE_ICONS, Clock, MetaChip } from "@/components/content/games/game-meta";
import { VideoEmbed } from "@/components/content/shared/video-embed";
import { DanceIcon, danceColor } from "@/components/content/dances/dance-meta";

type Data = Loaded<typeof dancePage>;

/** /dashboard/content/dances/:id — image, steps as a numbered list, music player and video. */
export function Component() {
  const { id } = useParams();
  const query = useApi<Data>(`/content/dances/${id}`);
  usePageTitle(query.data?.dance.title);
  return <QueryView query={query}>{(data) => <DancePage key={data.dance.id} data={data} />}</QueryView>;
}

function DancePage({ data }: { data: Data }) {
  const { dance, steps, canManage } = data;
  const t = useTranslations("content");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const color = danceColor(dance.category);
  const AgeIcon = AGE_ICONS[dance.ageGroup] ?? AGE_ICONS.ALL;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("dances.title"), href: "/dashboard/content/dances" }, { label: dance.title }]} />

      <section className="card overflow-hidden">
        <div className="grid md:grid-cols-5">
          <CoverArt src={dance.imageUrl} seed={dance.id} color={color} icon={<DanceIcon category={dance.category} />} className="aspect-[16/10] md:col-span-2 md:aspect-auto md:min-h-72" />
          <div className="flex flex-col justify-center gap-3 p-5 sm:p-7 md:col-span-3">
            <div className="flex flex-wrap gap-1.5">
              <Badge color={color}>{tc(`enums.DANCE_CATEGORIES.${dance.category}`)}</Badge>
              {canManage && <Badge tone={dance.isPublic ? "success" : "neutral"}>{dance.isPublic ? t("common.publicBadge") : t("common.privateBadge")}</Badge>}
            </div>
            <h1 dir="auto" className="text-3xl leading-tight font-extrabold text-ink sm:text-4xl ltr:text-left rtl:text-right">
              {dance.title}
            </h1>
            {dance.description && (
              <p dir="auto" className="text-base whitespace-pre-line text-ink-2 ltr:text-left rtl:text-right">
                {dance.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <MetaChip icon={AgeIcon} color={color} className="px-3 py-1.5 text-sm">
                {tc(`enums.ageGroup.${dance.ageGroup}`)}
              </MetaChip>
              {dance.durationMin != null && (
                <MetaChip icon={Clock} className="px-3 py-1.5 text-sm">
                  {t("common.minutes", { count: dance.durationMin })}
                </MetaChip>
              )}
            </div>
            {canManage && (
              <div className="mt-2 flex flex-wrap gap-2">
                <LinkButton href={`/dashboard/content/dances/${dance.id}/edit`} variant="outline" size="lg" className="rounded-full">
                  <Edit className="size-4" /> {tc("actions.edit")}
                </LinkButton>
                <ConfirmButton
                  action={() => deleteDance(dance.id)}
                  variant="outline"
                  size="lg"
                  className="rounded-full text-red-600"
                  title={t("common.deleteTitle")}
                  description={t("common.deleteText")}
                  confirmLabel={tc("actions.delete")}
                  redirectTo="/dashboard/content/dances"
                  ariaLabel={tc("actions.delete")}
                >
                  <Trash2 className="size-4" />
                </ConfirmButton>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card min-w-0 p-5 sm:p-6 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-ink">
            <Footprints className="size-5" style={{ color }} /> {t("dances.steps")}
          </h2>
          {steps.length ? (
            <ol className="space-y-3" data-testid="dance-steps">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-2xl text-base font-extrabold text-white shadow-sm" style={{ background: color }}>
                    {i + 1}
                  </span>
                  <p dir="auto" className="pt-1.5 text-base leading-relaxed text-ink ltr:text-left rtl:text-right">
                    {s}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-xl bg-surface-2/70 p-4 text-sm text-muted">{t("dances.noSteps")}</p>
          )}
        </section>
        <aside className="min-w-0 space-y-6">
          {dance.audioUrl && (
            <section className="card p-5">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-ink">
                <Music className="size-5" style={{ color }} /> {t("dances.music")}
              </h2>
              <AudioPlayer src={dance.audioUrl} title={dance.title} subtitle={tc(`enums.DANCE_CATEGORIES.${dance.category}`)} color={color} />
            </section>
          )}
          {dance.videoUrl && (
            <section className="card p-5">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-ink">
                <Video className="size-5" style={{ color }} /> {t("dances.video")}
              </h2>
              <VideoEmbed url={dance.videoUrl} title={dance.title} openLabel={t("dances.openVideo")} />
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

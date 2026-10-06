import { useLocale, useTranslations } from "use-intl";
import { CalendarDays, CalendarPlus, Clock, Edit, ExternalLink, Headphones, Link2, MapPin, Mic2, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import type { conferencePage } from "@api/modules/content/routes";
import { download } from "@/lib/api";
import { useApi } from "@/lib/query";
import { useParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { CATEGORY_COLORS } from "@onet/shared";
import { formatDate } from "@onet/shared";
import { deleteConference } from "@/api/content";
import { QueryView } from "@/components/states/page-state";
import { AudioPlayer } from "@/components/ui/audio-player";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClasses, LinkButton } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CoverArt } from "@/components/ui/cover-art";
import { Breadcrumbs } from "@/components/ui/page-header";
import { speakerNames, timeOf } from "@/components/content/conferences/conference-card";
import { VideoEmbed } from "@/components/content/shared/video-embed";

type Data = Loaded<typeof conferencePage>;

/** /dashboard/content/conferences/:id */
export function Component() {
  const { id } = useParams();
  const query = useApi<Data>(`/content/conferences/${id}`);
  usePageTitle(query.data?.conference.title);
  return <QueryView query={query}>{(data) => <ConferencePage key={data.conference.id} data={data} />}</QueryView>;
}

function ConferencePage({ data }: { data: Data }) {
  const { conference: c, upcoming, links, description, canManage } = data;
  const t = useTranslations("content");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const color = CATEGORY_COLORS[c.category] ?? "#1E9BD7";

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("conferences.title"), href: `/dashboard/content/conferences${upcoming ? "" : "?when=past"}` }, { label: c.title }]} />

      <section className="card overflow-hidden">
        <CoverArt src={c.coverUrl} seed={c.id} color={color} icon={<Mic2 />} className="aspect-[16/9] sm:aspect-[21/7]">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
            <div className="mb-2 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-extrabold" style={{ color }}>
                {tc(`enums.conferenceCategory.${c.category}`)}
              </span>
              <span className="rounded-full bg-black/30 px-2.5 py-1 text-xs font-extrabold backdrop-blur-sm">{upcoming ? t("conferences.upcoming") : t("conferences.past")}</span>
              {c.mediaUrl && (
                <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2.5 py-1 text-xs font-extrabold backdrop-blur-sm">
                  {c.mediaType === "VIDEO" ? <Video className="size-3.5" /> : <Headphones className="size-3.5" />} {t("conferences.recordingAvailable")}
                </span>
              )}
            </div>
            <h1 dir="auto" className="ltr:text-left rtl:text-right max-w-3xl text-2xl leading-tight font-extrabold drop-shadow sm:text-4xl">{c.title}</h1>
          </div>
        </CoverArt>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span className="flex items-center gap-2 font-bold text-ink">
              <CalendarDays className="size-4 text-brand-600" /> {formatDate(c.date, locale, "long")}
            </span>
            <span className="flex items-center gap-2 font-bold text-ink tabular-nums">
              <Clock className="size-4 text-brand-600" /> {timeOf(c.date, locale)}
            </span>
            {c.location && (
              <span className="flex items-center gap-2 font-bold text-ink">
                <MapPin className="size-4 text-brand-600" /> {c.location}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {upcoming && (
              <button
                type="button"
                onClick={() => download(`/content/conferences/${c.id}/ics`).catch(() => toast.error(tc("errors.unexpected")))}
                className={buttonClasses("primary", "md", "rounded-full")}
                data-testid="ics-link"
              >
                <CalendarPlus className="size-4" /> {t("conferences.addToCalendar")}
              </button>
            )}
            {canManage && (
              <>
                <LinkButton href={`/dashboard/content/conferences/${c.id}/edit`} variant="outline" className="rounded-full">
                  <Edit className="size-4" /> {tc("actions.edit")}
                </LinkButton>
                <ConfirmButton action={() => deleteConference(c.id)} variant="outline" size="md" className="rounded-full text-red-600" title={t("common.deleteTitle")} description={t("common.deleteText")} confirmLabel={tc("actions.delete")} redirectTo="/dashboard/content/conferences" ariaLabel={tc("actions.delete")}>
                  <Trash2 className="size-4" />
                </ConfirmButton>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {c.mediaUrl && (
            <section className="card p-5 sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-ink">
                {c.mediaType === "VIDEO" ? <Video className="size-5" style={{ color }} /> : <Headphones className="size-5" style={{ color }} />} {t("conferences.recording")}
              </h2>
              {c.mediaType === "VIDEO" ? <VideoEmbed url={c.mediaUrl} title={c.title} openLabel={t("games.openVideo")} /> : <AudioPlayer src={c.mediaUrl} title={c.title} subtitle={c.speaker} color={color} />}
            </section>
          )}
          {description && (
            <section className="card p-5 sm:p-6">
              <h2 className="mb-3 text-xl font-extrabold text-ink">{t("conferences.about")}</h2>
              <p className="text-base leading-relaxed whitespace-pre-line text-ink-2 ltr:text-left rtl:text-right" dir="auto">
                {description}
              </p>
            </section>
          )}
          {links.length > 0 && (
            <section className="card p-5 sm:p-6">
              <h2 className="mb-3 flex items-center gap-2 text-xl font-extrabold text-ink">
                <Link2 className="size-5" style={{ color }} /> {t("conferences.links")}
              </h2>
              <ul className="space-y-2">
                {links.map((l) => (
                  <li key={l}>
                    <a href={l} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-line p-3 text-sm font-bold text-ink hover:border-brand-200 hover:bg-brand-50/50" dir="ltr">
                      <ExternalLink className="size-4 shrink-0 text-brand-600" />
                      <span className="truncate">{l.replace(/^https?:\/\//, "")}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <aside className="min-w-0">
          <section className="card overflow-hidden">
            <div className="h-16" style={{ background: `linear-gradient(120deg, ${color}, ${color}88)` }} />
            <div className="-mt-9 px-5 pb-5">
              <Avatar {...speakerNames(c.speaker)} size="xl" ring />
              <p className="mt-2 text-xs font-extrabold tracking-wide text-muted uppercase">{t("conferences.speaker")}</p>
              <h2 className="text-xl font-extrabold text-ink">{c.speaker}</h2>
              {c.speakerBio && <p dir="auto" className="ltr:text-left rtl:text-right mt-1 text-sm leading-relaxed text-ink-2">{c.speakerBio}</p>}
              <div className="mt-3">
                <Badge color={color}>{tc(`enums.conferenceCategory.${c.category}`)}</Badge>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

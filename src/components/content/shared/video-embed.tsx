import { ExternalLink, PlayCircle } from "lucide-react";
import { isLocalFile, isVideoFile, videoEmbedUrl } from "@/server/content/shared";

/** Plays an uploaded video, embeds YouTube/Vimeo, or falls back to an external link. */
export function VideoEmbed({ url, title, openLabel }: { url: string; title: string; openLabel: string }) {
  const embed = videoEmbedUrl(url);
  if (embed) {
    return (
      <div className="aspect-video overflow-hidden rounded-2xl bg-ink">
        <iframe src={embed} title={title} className="size-full" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
      </div>
    );
  }
  if (isLocalFile(url) || isVideoFile(url)) {
    return (
      <video src={url} controls preload="metadata" playsInline className="aspect-video w-full rounded-2xl bg-ink" />
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl bg-ink p-4 font-bold text-white hover:bg-ink-2">
      <PlayCircle className="size-8 text-sun" />
      <span className="flex-1">{openLabel}</span>
      <ExternalLink className="size-4 opacity-70" />
    </a>
  );
}

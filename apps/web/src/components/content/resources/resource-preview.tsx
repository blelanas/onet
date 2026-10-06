import { assetUrl } from "@/lib/api";
import { useTranslations } from "use-intl";
import { useState } from "react";
import { Download, ExternalLink, Eye } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { VideoEmbed } from "@/components/content/shared/video-embed";
import { resourceMode } from "./resource-meta";
import { cn } from "@/lib/utils";

type Res = { id: string; title: string; type: string; url: string; description: string | null };

/** Preview / open button: inline PDF, image lightbox, video player; links open in a new tab. */
export function ResourceOpen({ res, className, children }: { res: Res; className?: string; children?: React.ReactNode }) {
  const t = useTranslations("content.resources");
  const tv = useTranslations("content.games");
  const [open, setOpen] = useState(false);
  const mode = resourceMode(res.type, res.url);
  const previewable = mode === "preview";

  if (!previewable) {
    return (
      <a href={assetUrl(res.url)} target="_blank" rel="noopener noreferrer" className={className} download={mode === "download" ? "" : undefined} data-testid="resource-open">
        {children ?? (
          <>
            {mode === "open" ? <ExternalLink className="size-4" /> : <Download className="size-4" />} {mode === "open" ? t("openNew") : t("download")}
          </>
        )}
      </a>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} data-testid="resource-preview">
        {children ?? (
          <>
            <Eye className="size-4" /> {t("preview")}
          </>
        )}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={res.title}
        description={res.description ?? undefined}
        size="xl"
        footer={
          <a href={assetUrl(res.url)} target="_blank" rel="noopener noreferrer" className={buttonClasses("outline")}>
            <ExternalLink className="size-4" /> {t("openNew")}
          </a>
        }
      >
        {res.type === "PDF" && (
          <object data={assetUrl(res.url)} type="application/pdf" className="h-[68dvh] w-full rounded-xl border border-line bg-surface-2">
            <iframe src={assetUrl(res.url)} title={res.title} className="h-[68dvh] w-full rounded-xl" />
            <p className="p-4 text-sm text-muted">{t("pdfFallback")}</p>
          </object>
        )}
        {res.type === "IMAGE" && (
          <div className="grid place-items-center rounded-xl bg-ink p-2">
            <img src={assetUrl(res.url)} alt={res.title} className={cn("max-h-[70dvh] w-auto rounded-lg object-contain")} />
          </div>
        )}
        {res.type === "VIDEO" && <VideoEmbed url={res.url} title={res.title} openLabel={tv("openVideo")} />}
      </Modal>
    </>
  );
}

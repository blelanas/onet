import { FileText, FileType2, Film, Image as ImageIcon, Link2, type LucideIcon } from "lucide-react";
import { isVideoFile, videoEmbedUrl } from "@/components/content/shared/media";

/** What opening a resource does: inline preview, new tab, or download. */
export function resourceMode(type: string, url: string): "preview" | "open" | "download" {
  const local = url.startsWith("/");
  if (type === "IMAGE" || (type === "PDF" && local) || (type === "VIDEO" && (local || isVideoFile(url) || !!videoEmbedUrl(url)))) return "preview";
  if (type === "DOCUMENT" && local) return "download";
  return "open";
}

export const RESOURCE_STYLE: Record<string, { icon: LucideIcon; color: string }> = {
  PDF: { icon: FileText, color: "#E30613" },
  IMAGE: { icon: ImageIcon, color: "#7C4DFF" },
  VIDEO: { icon: Film, color: "#1E9BD7" },
  DOCUMENT: { icon: FileType2, color: "#00A3A3" },
  LINK: { icon: Link2, color: "#2BB673" },
};

export function ResourceTypeIcon({ type, className = "size-12" }: { type: string; className?: string }) {
  const s = RESOURCE_STYLE[type] ?? RESOURCE_STYLE.DOCUMENT;
  const Icon = s.icon;
  return (
    <span className={`grid shrink-0 place-items-center rounded-2xl ${className}`} style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}B3)` }}>
      <Icon className="size-1/2 text-white" />
    </span>
  );
}

export function formatBytes(n?: number | null) {
  if (!n) return null;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

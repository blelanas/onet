"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, Loader2, Music, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type UploadedFile = { url: string; mimeType: string; sizeBytes: number; originalName: string };

/**
 * Drag-and-drop uploader. Posts to /api/upload (server validates type, size and magic bytes)
 * and writes the resulting URL into a hidden input named `name` so it submits with the form.
 */
export function Upload({
  name,
  kind = "image",
  defaultValue,
  label,
  accept,
  onUploaded,
  className,
}: {
  name: string;
  kind?: "image" | "document" | "audio" | "video";
  defaultValue?: string | null;
  label?: string;
  accept?: string;
  onUploaded?: (f: UploadedFile) => void;
  className?: string;
}) {
  const t = useTranslations("common");
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(defaultValue ?? "");
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const defaultAccept = { image: "image/*", document: ".pdf,.jpg,.jpeg,.png,.doc,.docx", audio: "audio/*", video: "video/mp4,video/webm" }[kind];

  async function upload(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "errors.unexpected");
      setUrl(json.url);
      setFileName(json.originalName);
      onUploaded?.(json);
    } catch (e) {
      const k = e instanceof Error ? e.message : "errors.unexpected";
      toast.error(k.startsWith("errors.") ? t(k) : k);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <span className="block text-sm font-bold text-ink-2">{label}</span>}
      <input type="hidden" name={name} value={url} />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) upload(f);
        }}
        className={cn(
          "relative flex items-center gap-4 rounded-2xl border-2 border-dashed p-4 transition",
          drag ? "border-brand-400 bg-brand-50" : "border-line bg-surface-2/40 hover:border-brand-200",
        )}
      >
        {url && kind === "image" ? (
          <img src={url} alt="" className="size-16 rounded-xl object-cover" />
        ) : (
          <div className="grid size-16 shrink-0 place-items-center rounded-xl bg-surface text-brand-600 shadow-[var(--shadow-soft)]">
            {busy ? <Loader2 className="size-6 animate-spin" /> : url ? kind === "audio" ? <Music className="size-6" /> : <FileText className="size-6" /> : <UploadCloud className="size-6" />}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{url ? (fileName ?? url.split("/").pop()) : t("upload.drop")}</p>
          <p className="text-xs text-muted">{t(`upload.hint.${kind}`)}</p>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => inputRef.current?.click()} className="rounded-xl bg-surface px-3 py-1.5 text-sm font-bold text-brand-700 shadow-[var(--shadow-soft)] hover:bg-brand-50" disabled={busy}>
            {url ? t("upload.replace") : t("upload.browse")}
          </button>
          {url && (
            <button type="button" onClick={() => setUrl("")} className="rounded-xl p-1.5 text-muted hover:bg-surface hover:text-red-600" aria-label={t("actions.remove")}>
              <X className="size-4" />
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept ?? defaultAccept}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

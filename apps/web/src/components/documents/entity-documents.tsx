import { useLocale, useTranslations } from "use-intl";
import { Download, FileImage, FileText, Trash2 } from "lucide-react";
import { formatDate } from "@onet/shared";
import { deleteDocument } from "@/api/documents";
import { assetUrl } from "@/lib/api";
import { useApi } from "@/lib/query";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentUploader } from "./document-uploader";

export function formatBytes(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`;
  return `${(n / 1024 / 1024).toFixed(1)} Mo`;
}

type Doc = { id: string; name: string; url: string; mimeType: string; sizeBytes: number; category: string; createdAt: Date; uploadedById: string | null; uploadedBy: { name: string } | null };
type Data = { docs: Doc[]; canWrite: boolean; canManage: boolean; userId: string };

/** Documents attached to one entity (member, trip, event, invoice, activity). Hidden when not allowed. */
export function EntityDocuments({ entityType, entityId }: { entityType: string; entityId: string }) {
  const t = useTranslations("documents");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { data, error, isLoading } = useApi<Data>("/documents/entity", { type: entityType, id: entityId });
  if (error) return null;
  if (isLoading || !data) return <Skeleton className="h-24 rounded-2xl" />;
  const { docs, canWrite, canManage, userId } = data;
  return (
    <div className="space-y-4">
      {canWrite && <DocumentUploader entityType={entityType} entityId={entityId} />}
      {docs.length === 0 ? (
        <EmptyState compact title={t("empty.title")} description={t("empty.entity")} />
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 p-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">{d.mimeType.startsWith("image/") ? <FileImage className="size-5" /> : <FileText className="size-5" />}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{d.name}</p>
                <p className="text-xs text-muted">
                  {formatBytes(d.sizeBytes)} · {formatDate(d.createdAt, locale)} {d.uploadedBy && `· ${d.uploadedBy.name}`}
                </p>
              </div>
              <Badge tone="neutral" className="hidden sm:inline-flex">
                {tc(`enums.documentCategory.${d.category}`)}
              </Badge>
              <a href={assetUrl(d.url)} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-brand-600" aria-label={tc("actions.download")}>
                <Download className="size-4" />
              </a>
              {(canManage || d.uploadedById === userId) && (
                <ConfirmButton action={() => deleteDocument(d.id)} size="icon-sm" ariaLabel={tc("actions.delete")}>
                  <Trash2 className="size-4 text-red-600" />
                </ConfirmButton>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

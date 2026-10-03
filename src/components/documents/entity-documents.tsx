import { getLocale, getTranslations } from "next-intl/server";
import { Download, FileImage, FileText, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates";
import { canAccessEntityDocs } from "@/server/documents/access";
import { deleteDocument } from "@/server/documents/actions";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { DocumentUploader } from "./document-uploader";

export function formatBytes(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`;
  return `${(n / 1024 / 1024).toFixed(1)} Mo`;
}

/** Documents attached to one entity (member, trip, event, invoice, activity). */
export async function EntityDocuments({ user, entityType, entityId, revalidate }: { user: CurrentUser; entityType: string; entityId: string; revalidate: string }) {
  const t = await getTranslations("documents");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  if (!(await canAccessEntityDocs(user, entityType, entityId, "read"))) return null;
  const [docs, canWrite] = await Promise.all([
    db.document.findMany({ where: { entityType, entityId }, orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { name: true } } } }),
    canAccessEntityDocs(user, entityType, entityId, "write"),
  ]);
  return (
    <div className="space-y-4">
      {canWrite && <DocumentUploader entityType={entityType} entityId={entityId} revalidate={revalidate} />}
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
              <a href={d.url} target="_blank" rel="noopener" className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-brand-600" aria-label={tc("actions.download")}>
                <Download className="size-4" />
              </a>
              {(user.permissions.has("documents.manage") || d.uploadedById === user.id) && (
                <ConfirmButton action={deleteDocument.bind(null, d.id)} size="icon-sm" ariaLabel={tc("actions.delete")}>
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

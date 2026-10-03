import { useLocale, useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { ArrowUpRight, Download, File, FileImage, FileText, FolderOpen, Trash2 } from "lucide-react";
import type { documentsLibraryPage } from "@api/modules/documents/routes";
import { DOCUMENT_CATEGORIES, DOCUMENT_ENTITY_TYPES, formatDate } from "@onet/shared";
import { assetUrl } from "@/lib/api";
import type { Loaded } from "@/lib/types";
import { deleteDocument } from "@/api/documents";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { FilterChips, FilterSelect, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { formatBytes } from "./entity-documents";

export const DOC_CATEGORY_COLORS: Record<string, string> = {
  MEDICAL: "#E8457C",
  ID: "#1E9BD7",
  AUTHORIZATION: "#2BB673",
  INVOICE: "#D98B00",
  REPORT: "#7C4DFF",
  PHOTO: "#00A3A3",
  OTHER: "#64748B",
};

type Data = Loaded<typeof documentsLibraryPage>;

/** Extension badge: uploaded URLs (/api/files/<id>) carry none, so use the document name, then the mime type. */
function extOf(name: string, mimeType: string) {
  const fromName = /\.([a-z0-9]{1,5})$/i.exec(name)?.[1];
  const fromMime = mimeType === "application/pdf" ? "pdf" : mimeType.split("/")[1]?.split(/[.+-]/).pop();
  return (fromName ?? fromMime ?? "").toUpperCase().slice(0, 4);
}

export function DocumentLibrary({ data, searchParams }: { data: Data; searchParams: Record<string, string | undefined> }) {
  const t = useTranslations("documents");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { rows, total, countsByType, page, pageSize, filtered, canManage, userId } = data;

  return (
    <>
      <Toolbar>
        <SearchBox />
        <FilterSelect param="category" allLabel={t("library.allCategories")} options={DOCUMENT_CATEGORIES.map((c) => ({ value: c, label: tc(`enums.documentCategory.${c}`) }))} />
        <p className="text-sm font-semibold text-muted sm:ms-auto">{t("library.count", { count: total })}</p>
      </Toolbar>
      <FilterChips
        param="type"
        allLabel={t("library.allEntities")}
        className="mb-5"
        options={DOCUMENT_ENTITY_TYPES.filter((e) => countsByType[e]).map((e) => ({ value: e, label: `${tc(`enums.entityType.${e}`)} · ${countsByType[e]}` }))}
      />
      {rows.length === 0 ? (
        <div className="card">
          <EmptyState title={t("empty.title")} description={filtered ? t("library.emptyFiltered") : t("library.emptyHint")} icon={<FolderOpen className="size-4" />} />
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((d, i) => {
            const color = DOC_CATEGORY_COLORS[d.category] ?? DOC_CATEGORY_COLORS.OTHER;
            const Icon = d.mimeType.startsWith("image/") ? FileImage : d.mimeType === "application/pdf" ? FileText : File;
            const ext = extOf(d.name, d.mimeType);
            const href = assetUrl(d.url);
            return (
              <li key={d.id} className="card card-hover flex animate-[var(--animate-fade-up)] flex-col gap-3 p-4" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                <div className="flex items-start gap-3">
                  <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: `${color}1A`, color }}>
                    <Icon className="size-6" />
                    {ext && <span className="absolute -bottom-1.5 rounded-md px-1 text-[9px] font-extrabold text-white" style={{ background: color }}>{ext}</span>}
                  </span>
                  <div className="min-w-0 flex-1">
                    <a href={href} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-sm font-bold break-words text-ink hover:text-brand-600" dir="auto">
                      {d.name}
                    </a>
                    <p className="mt-0.5 text-xs text-muted">
                      <span dir="ltr">{formatBytes(d.sizeBytes)}</span> · {formatDate(d.createdAt, locale)}
                      {d.uploadedBy && ` · ${d.uploadedBy.name}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge color={color}>{tc(`enums.documentCategory.${d.category}`)}</Badge>
                  {d.entity ? (
                    <Link href={d.entity.href} className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-bold text-ink-2 hover:bg-brand-50 hover:text-brand-700">
                      <span className="shrink-0 text-muted">{tc(`enums.entityType.${d.entityType}`)} ·</span>
                      <span className="truncate">{d.entity.label}</span>
                      <ArrowUpRight className="rtl-flip size-3 shrink-0" />
                    </Link>
                  ) : (
                    <Badge tone="neutral">{d.entityType === "GENERAL" ? t("library.general") : tc(`enums.entityType.${d.entityType}`)}</Badge>
                  )}
                </div>
                <div className="mt-auto flex items-center justify-end gap-1 border-t border-line pt-2">
                  <a href={href} target="_blank" rel="noopener noreferrer" download className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-ink-2 hover:bg-surface-2 hover:text-brand-600">
                    <Download className="size-4" /> {tc("actions.download")}
                  </a>
                  {(canManage || d.uploadedById === userId) && (
                    <ConfirmButton action={() => deleteDocument(d.id)} size="icon-sm" ariaLabel={tc("actions.delete")} description={t("library.deleteConfirm")}>
                      <Trash2 className="size-4 text-red-600" />
                    </ConfirmButton>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/dashboard/documents" searchParams={searchParams} />
    </>
  );
}

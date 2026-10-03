import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, Download, File, FileImage, FileText, FolderOpen, Trash2 } from "lucide-react";
import type { CurrentUser } from "@/lib/auth/session";
import { DOCUMENT_CATEGORIES, DOCUMENT_ENTITY_TYPES } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { listDocuments } from "@/server/documents/queries";
import { deleteDocument } from "@/server/documents/actions";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, paging } from "@/components/ui/pagination";
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

type SP = Record<string, string | string[] | undefined>;

export async function DocumentLibrary({ user, searchParams }: { user: CurrentUser; searchParams: SP }) {
  const t = await getTranslations("documents");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const str = (k: string) => (typeof searchParams[k] === "string" ? (searchParams[k] as string) : undefined);
  const { page, pageSize, skip, take } = paging(searchParams, 18);
  const filters = { q: str("q"), entityType: str("type"), category: str("category") };
  const { rows, total, countsByType } = await listDocuments(user, { ...filters, skip, take });
  const filtered = !!(filters.q || filters.entityType || filters.category);
  const canManage = user.permissions.has("documents.manage");

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
            const ext = (d.url.split(".").pop() ?? "").toUpperCase().slice(0, 4);
            return (
              <li key={d.id} className="card card-hover flex animate-[var(--animate-fade-up)] flex-col gap-3 p-4" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                <div className="flex items-start gap-3">
                  <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: `${color}1A`, color }}>
                    <Icon className="size-6" />
                    {ext && <span className="absolute -bottom-1.5 rounded-md px-1 text-[9px] font-extrabold text-white" style={{ background: color }}>{ext}</span>}
                  </span>
                  <div className="min-w-0 flex-1">
                    <a href={d.url} target="_blank" rel="noopener" className="line-clamp-2 text-sm font-bold break-words text-ink hover:text-brand-600" dir="auto">
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
                  <a href={d.url} target="_blank" rel="noopener" download className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-ink-2 hover:bg-surface-2 hover:text-brand-600">
                    <Download className="size-4" /> {tc("actions.download")}
                  </a>
                  {(canManage || d.uploadedById === user.id) && (
                    <ConfirmButton action={deleteDocument.bind(null, d.id)} size="icon-sm" ariaLabel={tc("actions.delete")} description={t("library.deleteConfirm")}>
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

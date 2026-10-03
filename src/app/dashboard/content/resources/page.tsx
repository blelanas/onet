import { getTranslations } from "next-intl/server";
import { BookOpen, Download, ExternalLink, Eye, FolderOpen, Trash2 } from "lucide-react";
import { pageQuery, requirePagePermission } from "@/lib/auth/guards";
import { RESOURCE_TYPES } from "@/lib/constants";
import { listResources, resourceCategories } from "@/server/content/resources";
import { deleteResource } from "@/server/content/resource-actions";
import { sp } from "@/server/content/shared";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips, FilterSelect, SearchBox } from "@/components/ui/toolbar";
import { ContentHero } from "@/components/content/shared/content-hero";
import { ResourceFormButton } from "@/components/content/resources/resource-form";
import { ResourceOpen } from "@/components/content/resources/resource-preview";
import { RESOURCE_STYLE, ResourceTypeIcon, formatBytes, resourceMode } from "@/components/content/resources/resource-meta";

export async function generateMetadata() {
  const t = await getTranslations("content.resources");
  return { title: t("title") };
}

type SP = Record<string, string | string[] | undefined>;

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePagePermission("content.read");
  const params = await searchParams;
  const t = await getTranslations("content");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const filters = { q: sp(params, "q"), type: sp(params, "type"), audience: sp(params, "audience") };
  const { rows, canManage } = await pageQuery(listResources(filters));
  const categories = canManage ? await resourceCategories() : [];
  const filtered = Object.values(filters).some(Boolean);

  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = r.category ?? "";
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }

  return (
    <>
      <ContentHero
        theme="resources"
        icon={<BookOpen />}
        eyebrow={tn("sections.content")}
        title={t("resources.title")}
        description={t("resources.description")}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("resources.title") }]}
        actions={canManage && <ResourceFormButton categories={categories} />}
      />

      <FilterChips param="type" allLabel={t("resources.allTypes")} options={RESOURCE_TYPES.map((v) => ({ value: v, label: tc(`enums.resourceType.${v}`), color: RESOURCE_STYLE[v].color }))} className="mb-3" />
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchBox placeholder={t("resources.searchPlaceholder")} />
        {canManage && <FilterSelect param="audience" allLabel={t("resources.allAudiences")} label={t("resources.audience")} options={["ALL", "PARENTS", "MONITORS", "KIDS"].map((a) => ({ value: a, label: tc(`enums.audience.${a}`) }))} />}
        <p className="text-sm font-bold text-muted sm:ms-auto">{t("resources.count", { count: rows.length })}</p>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={<FolderOpen className="size-4" />} title={filtered ? t("common.emptyFiltered") : t("resources.emptyTitle")} description={filtered ? tc("states.noResultsHint") : t("resources.emptyText")} />
        </div>
      ) : (
        <div className="gap-5 lg:columns-2 2xl:columns-3">
          {[...groups.entries()].map(([cat, items]) => (
            <section key={cat || "_"} aria-label={cat || t("resources.uncategorized")} className="card mb-5 break-inside-avoid overflow-hidden">
              <h2 className="flex items-center gap-2 border-b border-line bg-surface-2/50 px-4 py-3 text-base font-extrabold text-ink sm:px-5">
                <FolderOpen className="size-5 text-teal" /> {cat || t("resources.uncategorized")}
                <span className="ms-auto rounded-full bg-surface px-2 text-xs font-bold text-muted ring-1 ring-line">{items.length}</span>
              </h2>
              <ul className="divide-y divide-line">
                {items.map((r) => {
                  const style = RESOURCE_STYLE[r.type] ?? RESOURCE_STYLE.DOCUMENT;
                  const mode = resourceMode(r.type, r.url);
                  return (
                    <li key={r.id} className="group relative flex items-start gap-3 px-4 py-3.5 transition hover:bg-surface-2/60 sm:px-5">
                      <ResourceTypeIcon type={r.type} className="size-11 transition group-hover:scale-105" />
                      <div className="min-w-0 flex-1">
                        <h3 dir="auto" className="ltr:text-left rtl:text-right leading-snug font-extrabold text-ink group-hover:text-brand-700">
                          {/* The whole row opens the resource. */}
                          <ResourceOpen res={r} className="text-start after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
                            {r.title}
                          </ResourceOpen>
                        </h3>
                        {r.description && <p dir="auto" className="ltr:text-left rtl:text-right mt-0.5 line-clamp-2 text-sm text-muted">{r.description}</p>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Badge color={style.color}>{tc(`enums.resourceType.${r.type}`)}</Badge>
                          {canManage && <Badge tone={r.audience === "ALL" ? "neutral" : "violet"}>{tc(`enums.audience.${r.audience}`)}</Badge>}
                          {formatBytes(r.sizeBytes) && (
                            <span className="text-[11px] font-bold text-muted" dir="ltr">
                              {formatBytes(r.sizeBytes)}
                            </span>
                          )}
                          <span className="ms-auto inline-flex items-center gap-1 text-xs font-extrabold" style={{ color: style.color }} aria-hidden>
                            {mode === "open" ? <ExternalLink className="size-3.5" /> : mode === "download" ? <Download className="size-3.5" /> : <Eye className="size-3.5" />}
                            {t(mode === "open" ? "resources.openNew" : mode === "download" ? "resources.download" : "resources.preview")}
                          </span>
                        </div>
                      </div>
                      {canManage && (
                        <div className="relative z-10 -me-1 flex">
                          <ResourceFormButton variant="edit" initial={r} categories={categories} />
                          <ConfirmButton action={deleteResource.bind(null, r.id)} size="icon-sm" className="text-red-600" title={t("common.deleteTitle")} description={t("common.deleteText")} confirmLabel={tc("actions.delete")} ariaLabel={tc("actions.delete")}>
                            <Trash2 className="size-4" />
                          </ConfirmButton>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

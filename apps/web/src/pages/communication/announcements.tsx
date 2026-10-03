import { useTranslations } from "use-intl";
import { Megaphone } from "lucide-react";
import type { announcementsPage } from "@api/modules/communication/routes";
import { ANNOUNCEMENT_PRIORITIES, AUDIENCES } from "@onet/shared";
import { useApi } from "@/lib/query";
import { useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { QueryView } from "@/components/states/page-state";
import { RequirePerm } from "@/components/states/guards";
import { AnnouncementCard } from "@/components/communication/announcement-card";
import { AnnouncementFormButton } from "@/components/communication/announcement-form";
import { KidAnnouncements } from "@/components/communication/kid-announcements";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { FilterChips, FilterSelect, SearchBox, Toolbar } from "@/components/ui/toolbar";

type Data = Loaded<typeof announcementsPage>;

/** /dashboard/announcements */
export function Component() {
  const t = useTranslations("communication.announcements");
  usePageTitle(t("title"));
  return (
    <RequirePerm perm="announcements.read">
      <Announcements />
    </RequirePerm>
  );
}

function Announcements() {
  const sp = useSearchParamsObject();
  const query = useApi<Data>("/announcements", sp);
  return <QueryView query={query}>{(data) => (data.kid ? <KidAnnouncements rows={data.rows} /> : <AnnouncementsList data={data} sp={sp} />)}</QueryView>;
}

function AnnouncementsList({ data, sp }: { data: Data; sp: Record<string, string | undefined> }) {
  const t = useTranslations("communication.announcements");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const { rows, total, page, pageSize, canManage, groups } = data;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={<Megaphone className="size-6" />}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title") }]}
        actions={canManage ? <AnnouncementFormButton groups={groups} /> : undefined}
      />
      <div className="mx-auto max-w-4xl">
        <Toolbar>
          <SearchBox />
          <FilterSelect param="priority" allLabel={t("filters.allPriorities")} options={ANNOUNCEMENT_PRIORITIES.map((p) => ({ value: p, label: tc(`status.${p}`) }))} />
          {canManage && <FilterSelect param="audience" allLabel={t("filters.allAudiences")} options={AUDIENCES.map((a) => ({ value: a, label: tc(`enums.audience.${a}`) }))} />}
          {canManage && <FilterChips param="view" allLabel={t("filters.current")} options={[{ value: "expired", label: t("filters.expired") }]} className="sm:ms-auto" />}
        </Toolbar>
        {rows.length === 0 ? (
          <div className="card">
            <EmptyState title={t("empty.title")} description={t("empty.description")} icon={<Megaphone className="size-4" />} action={canManage ? <AnnouncementFormButton groups={groups} /> : undefined} />
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((a, i) => (
              <div key={a.id} className="animate-[var(--animate-fade-up)]" style={{ animationDelay: `${i * 40}ms` }}>
                <AnnouncementCard a={a} canManage={canManage} groups={groups} />
              </div>
            ))}
          </div>
        )}
        <Pagination page={page} pageSize={pageSize} total={total} basePath="/dashboard/announcements" searchParams={sp} />
      </div>
    </>
  );
}

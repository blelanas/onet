import { getTranslations } from "next-intl/server";
import { Megaphone } from "lucide-react";
import { can, requirePagePermission } from "@/lib/auth/guards";
import { ANNOUNCEMENT_PRIORITIES, AUDIENCES } from "@/lib/constants";
import { isKidOnly } from "@/server/communication/audience";
import { announcementGroupOptions, listAnnouncements } from "@/server/communication/announcements";
import { AnnouncementCard } from "@/components/communication/announcement-card";
import { AnnouncementFormButton } from "@/components/communication/announcement-form";
import { KidAnnouncements } from "@/components/communication/kid-announcements";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination, paging } from "@/components/ui/pagination";
import { FilterChips, FilterSelect, SearchBox, Toolbar } from "@/components/ui/toolbar";

export async function generateMetadata() {
  const t = await getTranslations("communication.announcements");
  return { title: t("title") };
}

type SP = Record<string, string | string[] | undefined>;

export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePagePermission("announcements.read");
  const sp = await searchParams;
  const t = await getTranslations("communication.announcements");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  if (isKidOnly(user)) {
    const { rows } = await listAnnouncements(user, { take: 30 });
    return <KidAnnouncements rows={rows} />;
  }

  const canManage = can(user, "announcements.manage");
  const { page, pageSize, skip, take } = paging(sp, 10);
  const [{ rows, total }, groups] = await Promise.all([
    listAnnouncements(user, { q: str("q"), priority: str("priority"), audience: canManage ? str("audience") : undefined, expired: canManage && str("view") === "expired", skip, take }),
    canManage ? announcementGroupOptions() : Promise.resolve([]),
  ]);

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

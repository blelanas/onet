import { getTranslations } from "next-intl/server";
import { ClipboardCheck } from "lucide-react";
import { can, requirePagePermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { RollView } from "@/components/attendance/roll-view";
import { HistoryView } from "@/components/attendance/history-view";
import { FamilyView } from "@/components/attendance/family-view";

type SP = Record<string, string | string[] | undefined>;

export async function generateMetadata() {
  const t = await getTranslations("attendance");
  return { title: t("title") };
}

export default async function AttendancePage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePagePermission("attendance.read");
  const sp = await searchParams;
  const t = await getTranslations("attendance");
  const tn = await getTranslations("nav");
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const manager = can(user, "attendance.manage");
  const view = manager && str("view") === "history" ? "history" : "roll";

  if (!manager) {
    return (
      <>
        <PageHeader title={t("family.title")} description={t("family.description")} icon={<ClipboardCheck className="size-6" />} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title") }]} />
        <FamilyView user={user} />
      </>
    );
  }

  const keep = str("ctx") ? `ctx=${encodeURIComponent(str("ctx")!)}` : "";
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} icon={<ClipboardCheck className="size-6" />} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title") }]} />
      <LinkTabs
        active={view}
        tabs={[
          { key: "roll", label: t("tabs.roll"), href: `/dashboard/attendance${keep ? `?${keep}` : ""}` },
          { key: "history", label: t("tabs.history"), href: `/dashboard/attendance?view=history${keep ? `&${keep}` : ""}` },
        ]}
      />
      {view === "roll" ? <RollView user={user} ctxParam={str("ctx")} dateParam={str("date")} /> : <HistoryView user={user} ctxParam={str("ctx")} weeksParam={str("weeks")} />}
    </>
  );
}

import { useTranslations } from "use-intl";
import { ClipboardCheck } from "lucide-react";
import { can, useMe } from "@/lib/auth";
import { useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import { RequirePerm } from "@/components/states/guards";
import { PageHeader } from "@/components/ui/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { RollView } from "@/components/attendance/roll-view";
import { HistoryView } from "@/components/attendance/history-view";
import { FamilyView } from "@/components/attendance/family-view";

export function Component() {
  const t = useTranslations("attendance");
  usePageTitle(t("title"));
  return (
    <RequirePerm perm="attendance.read">
      <AttendancePage />
    </RequirePerm>
  );
}

function AttendancePage() {
  const user = useMe();
  const sp = useSearchParamsObject();
  const t = useTranslations("attendance");
  const tn = useTranslations("nav");
  const manager = can(user, "attendance.manage");
  const view = manager && sp.view === "history" ? "history" : "roll";

  if (!manager) {
    return (
      <>
        <PageHeader title={t("family.title")} description={t("family.description")} icon={<ClipboardCheck className="size-6" />} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title") }]} />
        <FamilyView />
      </>
    );
  }

  const keep = sp.ctx ? `ctx=${encodeURIComponent(sp.ctx)}` : "";
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
      {view === "roll" ? <RollView ctxParam={sp.ctx} dateParam={sp.date} /> : <HistoryView ctxParam={sp.ctx} weeksParam={sp.weeks} />}
    </>
  );
}

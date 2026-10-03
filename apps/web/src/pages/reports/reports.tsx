import { useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import { BarChart3, Download } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@onet/shared";
import { can, useMe } from "@/lib/auth";
import { useSearchParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import { exportReport } from "@/api/reports";
import { RequirePerm } from "@/components/states/guards";
import { ActivitiesReport } from "@/components/reports/activities-report";
import { EventsReport } from "@/components/reports/events-report";
import { FinanceSummary } from "@/components/reports/finance-summary";
import { MembersReport } from "@/components/reports/members-report";
import { TripsReport } from "@/components/reports/trips-report";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { LinkTabs } from "@/components/ui/tabs";

const TABS = ["members", "activities", "events", "trips", "finance"] as const;
type Tab = (typeof TABS)[number];

/** /dashboard/reports (?tab=members|activities|events|trips|finance) */
export function Component() {
  const t = useTranslations("reports");
  usePageTitle(t("title"));
  return (
    <RequirePerm perm={["reports.read", "members.read_all"]}>
      <Reports />
    </RequirePerm>
  );
}

function Reports() {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const me = useMe();
  const raw = useSearchParams().get("tab") ?? "";
  const tab: Tab = (TABS as readonly string[]).includes(raw) ? (raw as Tab) : "members";
  const showMoney = can(me, "finance.read");
  const [exporting, setExporting] = useState(false);

  const onExport = async () => {
    setExporting(true);
    try {
      await exportReport(tab);
    } catch {
      toast.error(tc("errors.unexpected"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={<BarChart3 className="size-6" />}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title") }]}
        actions={
          tab !== "finance" ? (
            <Button variant="outline" onClick={onExport} loading={exporting}>
              <Download className="size-4" /> {tc("actions.exportCsv")}
            </Button>
          ) : undefined
        }
      />
      <LinkTabs active={tab} tabs={TABS.map((k) => ({ key: k, label: t(`tabs.${k}`), href: k === "members" ? "/dashboard/reports" : `/dashboard/reports?tab=${k}` }))} />
      {tab === "members" && <MembersReport />}
      {tab === "activities" && <ActivitiesReport />}
      {tab === "events" && <EventsReport />}
      {tab === "trips" && <TripsReport />}
      {tab === "finance" && <FinanceSummary showMoney={showMoney} />}
      <p className="mt-6 text-center text-xs text-muted">{t("generatedAt", { date: formatDateTime(new Date(), locale) })}</p>
    </>
  );
}

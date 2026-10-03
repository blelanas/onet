import { getLocale, getTranslations } from "next-intl/server";
import { BarChart3, Download } from "lucide-react";
import { can, requirePagePermission } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/dates";
import { ActivitiesReport } from "@/components/reports/activities-report";
import { EventsReport } from "@/components/reports/events-report";
import { FinanceSummary } from "@/components/reports/finance-summary";
import { MembersReport } from "@/components/reports/members-report";
import { TripsReport } from "@/components/reports/trips-report";
import { buttonClasses } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { LinkTabs } from "@/components/ui/tabs";

export async function generateMetadata() {
  const t = await getTranslations("reports");
  return { title: t("title") };
}

const TABS = ["members", "activities", "events", "trips", "finance"] as const;
type Tab = (typeof TABS)[number];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requirePagePermission("reports.read", "members.read_all");
  const { tab: raw } = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(raw ?? "") ? (raw as Tab) : "members";
  const t = await getTranslations("reports");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const locale = await getLocale();
  const showMoney = can(user, "finance.read");

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={<BarChart3 className="size-6" />}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title") }]}
        actions={
          tab !== "finance" ? (
            <a href={`/api/reports/${tab}`} className={buttonClasses("outline")}>
              <Download className="size-4" /> {tc("actions.exportCsv")}
            </a>
          ) : undefined
        }
      />
      <LinkTabs active={tab} tabs={TABS.map((k) => ({ key: k, label: t(`tabs.${k}`), href: k === "members" ? "/dashboard/reports" : `/dashboard/reports?tab=${k}` }))} />
      {tab === "members" && <MembersReport />}
      {tab === "activities" && <ActivitiesReport />}
      {tab === "events" && <EventsReport showMoney={showMoney} />}
      {tab === "trips" && <TripsReport showMoney={showMoney} />}
      {tab === "finance" && <FinanceSummary showMoney={showMoney} />}
      <p className="mt-6 text-center text-xs text-muted">{t("generatedAt", { date: formatDateTime(new Date(), locale) })}</p>
    </>
  );
}

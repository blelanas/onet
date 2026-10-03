import { useTranslations } from "use-intl";
import type { dashboardPage } from "@api/modules/dashboard/routes";
import { useApi } from "@/lib/query";
import { useSearchParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { QueryView } from "@/components/states/page-state";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { AccountantDashboard } from "@/components/dashboard/accountant-dashboard";
import { MonitorDashboard } from "@/components/dashboard/monitor-dashboard";
import { ParentDashboard } from "@/components/dashboard/parent-dashboard";
import { KidDashboard } from "@/components/dashboard/kid-dashboard";
import { MemberDashboard } from "@/components/dashboard/member-dashboard";

type Data = Loaded<typeof dashboardPage>;

/** Role dashboard: the API picks the flavour from the user's roles (`kind`). */
export function Component() {
  const t = useTranslations("dashboard.meta");
  usePageTitle(t("title"));
  const child = useSearchParams().get("child") ?? undefined;
  const query = useApi<Data>("/dashboard", { child });
  return <QueryView query={query}>{(res) => <Flavour res={res} />}</QueryView>;
}

function Flavour({ res }: { res: Data }) {
  switch (res.kind) {
    case "admin":
      return <AdminDashboard d={res.data} />;
    case "accountant":
      return <AccountantDashboard d={res.data} />;
    case "monitor":
      return <MonitorDashboard d={res.data} />;
    case "parent":
      return <ParentDashboard d={res.data} />;
    case "kid":
      return <KidDashboard d={res.data} />;
    default:
      return <MemberDashboard d={res.data} />;
  }
}

import { getTranslations } from "next-intl/server";
import { can, requirePagePermission } from "@/lib/auth/guards";
import type { CurrentUser } from "@/lib/auth/session";
import { DASHBOARD_PRIORITY, type RoleKey } from "@/lib/permissions";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { AccountantDashboard } from "@/components/dashboard/accountant-dashboard";
import { MonitorDashboard } from "@/components/dashboard/monitor-dashboard";
import { ParentDashboard } from "@/components/dashboard/parent-dashboard";
import { KidDashboard } from "@/components/dashboard/kid-dashboard";
import { MemberDashboard } from "@/components/dashboard/member-dashboard";

export async function generateMetadata() {
  const t = await getTranslations("dashboard.meta");
  return { title: t("title") };
}

/** Which dashboard flavour to render: first matching role in DASHBOARD_PRIORITY. */
function flavour(user: CurrentUser): RoleKey {
  const role = DASHBOARD_PRIORITY.find((r) => user.roles.includes(r)) ?? "member";
  // Roles are editable in Settings: never show finance widgets without the permission.
  if (role === "accountant" && !can(user, "finance.read")) return "member";
  return role;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const user = await requirePagePermission("dashboard.view");
  const { child } = await searchParams;
  switch (flavour(user)) {
    case "super_admin":
    case "admin":
      return <AdminDashboard user={user} />;
    case "accountant":
      return <AccountantDashboard user={user} />;
    case "monitor":
      return <MonitorDashboard user={user} />;
    case "parent":
      return <ParentDashboard user={user} childId={child} />;
    case "kid":
      return <KidDashboard user={user} />;
    default:
      return <MemberDashboard user={user} />;
  }
}

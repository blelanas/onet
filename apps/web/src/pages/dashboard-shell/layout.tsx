import { Suspense } from "react";
import { Outlet } from "react-router";
import { useMe } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { PageSkeleton } from "@/components/ui/skeleton";

export default function DashboardLayout() {
  const me = useMe();
  return (
    <AppShell user={{ name: me.name, email: me.email, avatarUrl: me.avatarUrl, roles: me.roles, perms: me.perms, points: me.points }} unread={me.unread} badges={{ approvals: me.pendingApprovals }}>
      <Suspense fallback={<PageSkeleton />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}

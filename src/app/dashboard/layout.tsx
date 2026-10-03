import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });
  return (
    <AppShell
      user={{ name: user.name, email: user.email, avatarUrl: user.avatarUrl, roles: user.roles, perms: [...user.permissions], points: user.points }}
      unread={unread}
    >
      {children}
    </AppShell>
  );
}

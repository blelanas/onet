import { Navigate, useLocation } from "react-router";
import type { Permission } from "@onet/shared";
import { can, useAuth } from "@/lib/auth";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Forbidden } from "./page-state";

/** Redirects anonymous visitors to /login?next=… */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { me, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-6"><PageSkeleton /></div>;
  if (!me) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}

/**
 * UX-only permission gate (the API enforces every permission itself).
 * Shows the forbidden page instead of firing requests that would 403.
 */
export function RequirePerm({ perm, any, children }: { perm?: Permission | Permission[]; any?: Permission[]; children: React.ReactNode }) {
  const { me } = useAuth();
  const perms = perm ? (Array.isArray(perm) ? perm : [perm]) : [];
  const ok = can(me, ...perms) && (!any || any.some((p) => me?.perms.includes(p)));
  return ok ? <>{children}</> : <Forbidden />;
}

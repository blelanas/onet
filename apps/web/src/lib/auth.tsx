import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Permission, RoleKey } from "@onet/shared";
import { apiGet, apiSend, tokenStore } from "./api";
import { queryClient } from "./query";

export type Me = {
  id: string;
  name: string;
  email: string;
  locale: string;
  avatarUrl: string | null;
  roles: RoleKey[];
  perms: Permission[];
  memberId: string | null;
  memberType: string | null;
  points: number;
  unread: number;
  /** ACTIVE, or PENDING while a self sign-up waits for approval (no roles, no permissions). */
  status: "ACTIVE" | "PENDING";
  requestedRole: RoleKey | null;
  /** Pending sign-ups count, for approvers' nav badge (0 otherwise). */
  pendingApprovals: number;
};

type AuthState = { me: Me | null; loading: boolean };
const AuthContext = createContext<AuthState>({ me: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ["/auth/me"],
    queryFn: () => (tokenStore.get() ? apiGet<Me | null>("/auth/me").catch(() => null) : Promise.resolve(null)),
    staleTime: 60_000,
  });
  return <AuthContext.Provider value={{ me: data ?? null, loading: isLoading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/** The signed-in user (only call inside routes guarded by <RequireAuth/>). */
export function useMe(): Me {
  const { me } = useContext(AuthContext);
  if (!me) throw new Error("useMe() outside an authenticated route");
  return me;
}

export function can(me: Me | null | undefined, ...perms: Permission[]) {
  return !!me && perms.every((p) => me.perms.includes(p));
}

export function canAny(me: Me | null | undefined, ...perms: Permission[]) {
  return !!me && perms.some((p) => me.perms.includes(p));
}

export function hasRole(me: Me | null | undefined, ...roles: RoleKey[]) {
  return !!me && roles.some((r) => me.roles.includes(r));
}

/** Drops every cached response except the current user (which is replaced in place, see below). */
function forgetOtherQueries() {
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "/auth/me" });
}

/**
 * The /auth/me query is updated in place rather than removed: `queryClient.clear()` would detach
 * the AuthProvider's observer from it, leaving a stale (or null) user on screen until a reload.
 */
export async function signIn(token: string) {
  tokenStore.set(token);
  const me = await apiGet<Me | null>("/auth/me");
  forgetOtherQueries();
  queryClient.setQueryData(["/auth/me"], me);
}

export async function signOut() {
  await apiSend("POST", "/auth/logout");
  tokenStore.set(null);
  forgetOtherQueries();
  queryClient.setQueryData(["/auth/me"], null);
}

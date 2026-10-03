import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "./session";
import type { Permission, RoleKey } from "@/lib/permissions";

export class AuthError extends Error {
  constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND", message?: string) {
    super(message ?? code);
  }
}

export function can(user: CurrentUser | null, ...perms: Permission[]) {
  return !!user && perms.every((p) => user.permissions.has(p));
}

export function canAny(user: CurrentUser | null, ...perms: Permission[]) {
  return !!user && perms.some((p) => user.permissions.has(p));
}

export function hasRole(user: CurrentUser | null, ...roles: RoleKey[]) {
  return !!user && roles.some((r) => user.roles.includes(r));
}

/** For pages/layouts: redirects to /login when anonymous. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For pages: redirects to /dashboard/forbidden when the permission is missing. */
export async function requirePagePermission(...perms: Permission[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user, ...perms)) redirect("/dashboard/forbidden");
  return user;
}

/** For server actions / route handlers: throws AuthError (caught by `action()` wrapper). */
export async function requirePermission(...perms: Permission[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  if (!can(user, ...perms)) throw new AuthError("FORBIDDEN");
  return user;
}

export async function requireAnyPermission(...perms: Permission[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  if (!canAny(user, ...perms)) throw new AuthError("FORBIDDEN");
  return user;
}

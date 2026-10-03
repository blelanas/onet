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

/**
 * For pages: run a query that may throw AuthError and map it to the right navigation
 * (404 page for NOT_FOUND, forbidden page for FORBIDDEN, login for UNAUTHENTICATED).
 */
export async function pageQuery<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof AuthError) {
      const { notFound } = await import("next/navigation");
      if (e.code === "NOT_FOUND") notFound();
      if (e.code === "FORBIDDEN") redirect("/dashboard/forbidden");
      redirect("/login");
    }
    throw e;
  }
}

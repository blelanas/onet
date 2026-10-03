import { getCurrentUser, type CurrentUser } from "./session";
import type { Permission, RoleKey } from "@onet/shared";

export class AuthError extends Error {
  constructor(
    public code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND",
    message?: string,
  ) {
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

/** Any authenticated user. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  return user;
}

/** Throws AuthError (mapped to 401/403 by the route helpers). */
export async function requirePermission(...perms: Permission[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user, ...perms)) throw new AuthError("FORBIDDEN");
  return user;
}

export async function requireAnyPermission(...perms: Permission[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!canAny(user, ...perms)) throw new AuthError("FORBIDDEN");
  return user;
}

// Aliases kept so code ported from the Next.js pages reads the same.
export const requirePagePermission = requirePermission;
export async function pageQuery<T>(p: Promise<T>): Promise<T> {
  return p;
}

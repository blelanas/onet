import { Router, type Request } from "express";
import { can, hasRole, requirePermission, AuthError } from "@api/lib/auth/guards";
import type { CurrentUser } from "@api/lib/auth/session";
import { mutation, param, qs, query } from "@api/lib/http";
import { DASHBOARD_PRIORITY, type Permission, type RoleKey } from "@onet/shared";
import { adminDashboard } from "./admin";
import { accountantDashboard } from "./accountant";
import { monitorDashboard } from "./monitor";
import { parentDashboard } from "./parent";
import { kidDashboard } from "./kid";
import { memberDashboard } from "./member";
import { myChildDetail, myChildrenOverview } from "./my-children";
import { achievements, resolveAchievementsMember } from "./achievements";
import { setMyTaskStatus } from "./actions";

/** dashboard module routes (mounted under /api). */
export const router = Router();

/**
 * Roles are editable in Settings, so a flavour that exposes association-wide data also needs
 * the matching permission: the admin dashboard lists every member and registration, the
 * accountant one shows finance.
 */
const FLAVOUR_PERMISSIONS: Partial<Record<RoleKey, Permission[]>> = {
  super_admin: ["members.read_all"],
  admin: ["members.read_all"],
  accountant: ["finance.read"],
};

/** Which dashboard flavour to render: first role in DASHBOARD_PRIORITY the user has (with its permissions). */
function flavour(user: CurrentUser): RoleKey {
  return (
    DASHBOARD_PRIORITY.find((r) => {
      if (!user.roles.includes(r)) return false;
      const perms = FLAVOUR_PERMISSIONS[r];
      return !perms || can(user, ...perms);
    }) ?? "member"
  );
}

/** Role dashboard: the flavour is chosen server-side from the user's roles. */
export async function dashboardPage(req: Request) {
  const user = await requirePermission("dashboard.view");
  switch (flavour(user)) {
    case "super_admin":
    case "admin":
      return { kind: "admin" as const, data: await adminDashboard(user) };
    case "accountant":
      return { kind: "accountant" as const, data: await accountantDashboard(user.id) };
    case "monitor":
      return { kind: "monitor" as const, data: await monitorDashboard(user) };
    case "parent":
      return { kind: "parent" as const, data: await parentDashboard(user, qs(req, "child")) };
    case "kid":
      return { kind: "kid" as const, data: await kidDashboard(user) };
    default:
      return { kind: "member" as const, data: await memberDashboard(user) };
  }
}
router.get("/dashboard", query(dashboardPage));

/** Parent space: overview of every child + details of the selected one (guardianship enforced). */
export async function myChildrenPage(req: Request) {
  const user = await requirePermission("members.read");
  if (!hasRole(user, "parent")) throw new AuthError("FORBIDDEN");
  const kids = await myChildrenOverview(user);
  if (!kids.length) return { kids, detail: null };
  const childParam = qs(req, "child");
  const selectedId = kids.find((k) => k.id === childParam)?.id ?? kids[0].id;
  return { kids, detail: await myChildDetail(user, selectedId) };
}
router.get("/dashboard/my-children", query(myChildrenPage));

/** Badges, level and history: a kid sees their own, a parent one of their children. */
export async function achievementsPage(req: Request) {
  // Kids have no members.read: they may see their own page; a parent's child view needs it (see resolver).
  const user = await requirePermission("dashboard.view");
  const who = await resolveAchievementsMember(user, qs(req, "child"));
  return {
    kids: who.kids.map((k) => ({ id: k.id, firstName: k.firstName, lastName: k.lastName, photoUrl: k.photoUrl, group: k.group ? { color: k.group.color } : null })),
    viewingChild: who.viewingChild,
    data: who.memberId ? await achievements(who.memberId) : null,
  };
}
router.get("/dashboard/achievements", query(achievementsPage));

router.post(
  "/dashboard/tasks/:id/status",
  mutation((req) => setMyTaskStatus(param(req, "id"), String(req.body?.status ?? ""))),
);

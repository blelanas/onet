import { Router, type Request } from "express";
import { db } from "@api/lib/db";
import { AuthError, can, requirePermission } from "@api/lib/auth/guards";
import type { CurrentUser } from "@api/lib/auth/session";
import { myGroupIds } from "@api/lib/auth/scope";
import { mutation, param, qs, query } from "@api/lib/http";
import { addDaysLocal, normalizeDay } from "@api/modules/attendance/day";
import {
  activityAttendance,
  activityFormOptions,
  activityParticipants,
  activityReports,
  activityStats,
  canManageActivity,
  enrollCandidates,
  getActivity,
  listActivities,
  myActivities,
} from "./queries";
import { addActivityReport, deleteActivity, deleteActivityReport, enrollChild, saveActivity, unenrollChild } from "./actions";

/** activities module routes (mounted under /api). */
export const router = Router();

const pageOf = (req: Request) => Math.max(1, Number(qs(req, "page")) || 1);

/**
 * Activities list. Managers (activities.manage) get the catalogue with stats and filters;
 * everyone else gets "their" activities (enrolled / group / led) + the rest to discover.
 */
export async function activitiesPage(req: Request) {
  const user = await requirePermission("activities.read");
  const page = pageOf(req);
  if (can(user, "activities.manage")) {
    const pageSize = 12;
    const filters = { q: qs(req, "q"), category: qs(req, "category"), status: qs(req, "status"), groupId: qs(req, "group"), mine: qs(req, "mine") === "1" };
    const [{ rows, total }, stats, groups] = await Promise.all([
      listActivities(user, { ...filters, skip: (page - 1) * pageSize, take: pageSize }),
      activityStats(user),
      db.group.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);
    return { view: "manager" as const, rows, total, page, pageSize, stats, groups, filtered: Object.values(filters).some(Boolean) };
  }
  const pageSize = 9;
  const mine = await myActivities(user);
  const { rows, total } = await listActivities(user, { q: qs(req, "q"), category: qs(req, "category"), excludeIds: mine.map((a) => a.id), skip: (page - 1) * pageSize, take: pageSize });
  return { view: "personal" as const, mine, rows, total, page, pageSize };
}
router.get("/activities", query(activitiesPage));

async function formOptions(user: CurrentUser, keepGroupId?: string | null) {
  const opts = await activityFormOptions();
  const admin = can(user, "members.read_all") || can(user, "groups.manage");
  const mine = admin ? null : await myGroupIds(user);
  return {
    admin,
    monitors: opts.monitors.map((m) => ({ id: m.id, name: `${m.firstName} ${m.lastName}` })),
    groups: opts.groups.filter((g) => !mine || mine.includes(g.id) || g.id === keepGroupId),
    events: opts.events,
  };
}

/** Options for the "new activity" form (monitors only see their own groups). */
export async function activityNewPage() {
  const user = await requirePermission("activities.manage");
  return { ...(await formOptions(user)), memberId: user.memberId };
}
router.get("/activities/form-options", query(activityNewPage));

/** Edit form: the activity + options. Monitors may only edit activities they lead / of their groups. */
export async function activityEditPage(req: Request) {
  const user = await requirePermission("activities.manage");
  const a = await getActivity(user, param(req, "id"));
  if (!(await canManageActivity(user, a))) throw new AuthError("FORBIDDEN");
  return { activity: a, ...(await formOptions(user, a.groupId)) };
}
router.get("/activities/:id/form", query(activityEditPage));

/** Activity detail. Tab data is loaded only for the active tab (like the former server page). */
export async function activityPage(req: Request) {
  const user = await requirePermission("activities.read");
  const id = param(req, "id");
  const a = await getActivity(user, id);
  const canManage = await canManageActivity(user, a);
  const isStaffView = can(user, "activities.manage");
  const tabKeys = ["overview", "participants", "attendance", ...(isStaffView ? ["reports"] : [])];
  const tab = tabKeys.includes(qs(req, "tab") ?? "") ? qs(req, "tab")! : "overview";

  const [participants, sessions, reports, candidates] = await Promise.all([
    activityParticipants(user, id),
    tab === "attendance" ? activityAttendance(user, id) : Promise.resolve([]),
    tab === "reports" && isStaffView ? activityReports(id) : Promise.resolve([]),
    tab === "participants" && canManage ? enrollCandidates(user, id) : Promise.resolve([]),
  ]);

  // Upcoming occurrences of the weekly slot.
  const today = normalizeDay();
  const upcoming: Date[] = [];
  if (a.dayOfWeek != null && a.status === "ACTIVE") {
    let d = addDaysLocal(today, (a.dayOfWeek - today.getDay() + 7) % 7);
    if (a.startDate && d < a.startDate) d = addDaysLocal(normalizeDay(a.startDate), (a.dayOfWeek - a.startDate.getDay() + 7) % 7);
    for (let i = 0; i < 4 && (!a.endDate || d <= a.endDate); i++) {
      upcoming.push(d);
      d = addDaysLocal(d, 7);
    }
  }

  // The page only shows the monitor's name/photo (+ a message link): don't ship their phone.
  const monitor = a.monitor ? { id: a.monitor.id, firstName: a.monitor.firstName, lastName: a.monitor.lastName, photoUrl: a.monitor.photoUrl, userId: a.monitor.userId } : null;
  return { activity: { ...a, monitor }, tab, tabKeys, canManage, isStaffView, participants, sessions, reports, candidates, upcoming, today };
}
router.get("/activities/:id", query(activityPage));

// ── Mutations ──
router.post(
  "/activities",
  mutation((req) => saveActivity(req.body)),
);
router.delete(
  "/activities/reports/:reportId",
  mutation((req) => deleteActivityReport(param(req, "reportId"))),
);
router.delete(
  "/activities/:id",
  mutation((req) => deleteActivity(param(req, "id"))),
);
router.post(
  "/activities/:id/participants",
  mutation((req) => enrollChild(param(req, "id"), String(req.body?.memberId ?? ""))),
);
router.delete(
  "/activities/:id/participants/:memberId",
  mutation((req) => unenrollChild(param(req, "id"), param(req, "memberId"))),
);
router.post(
  "/activities/:id/reports",
  mutation((req) => addActivityReport({ ...req.body, activityId: param(req, "id") })),
);

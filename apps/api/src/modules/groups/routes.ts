import { Router, type Request } from "express";
import { db } from "@api/lib/db";
import { can, requirePermission } from "@api/lib/auth/guards";
import { myGroupIds } from "@api/lib/auth/scope";
import { mutation, param, qs, query } from "@api/lib/http";
import {
  assertCanSeeGroup,
  canWorkOnGroup,
  childCandidates,
  getGroup,
  groupAnnouncements,
  groupActivities,
  groupAttendanceStats,
  groupChildren,
  groupTasks,
  listGroups,
  monitorCandidates,
  seesAllGroups,
} from "./queries";
import {
  addChildToGroup,
  assignMonitor,
  createGroupTask,
  cycleTaskStatus,
  deleteGroup,
  deleteGroupTask,
  removeChildFromGroup,
  removeMonitor,
  saveGroup,
  setLeadMonitor,
} from "./actions";

/** groups module routes (mounted under /api). */
export const router = Router();

/** Groups grid: staff see every group, monitors only theirs (myGroupIds). */
export async function groupsPage(req: Request) {
  const user = await requirePermission("groups.read");
  const [groups, mine] = await Promise.all([listGroups(user, { q: qs(req, "q"), status: qs(req, "status") }), myGroupIds(user)]);
  return { groups, mine, all: seesAllGroups(user) };
}
router.get("/groups", query(groupsPage));

// Tasks (static paths registered before /groups/:id).
router.post(
  "/groups/tasks/:taskId/cycle",
  mutation((req) => cycleTaskStatus(param(req, "taskId"))),
);
router.delete(
  "/groups/tasks/:taskId",
  mutation((req) => deleteGroupTask(param(req, "taskId"))),
);

/** Group header (all tabs) + whether the user may work on it (tasks / roll call). */
export async function groupPage(req: Request) {
  const user = await requirePermission("groups.read");
  const id = param(req, "id");
  const group = await getGroup(user, id);
  return { group, canWork: await canWorkOnGroup(user, id) };
}
router.get("/groups/:id", query(groupPage));

/** Data for the edit form. */
export async function groupFormPage(req: Request) {
  const user = await requirePermission("groups.manage");
  return getGroup(user, param(req, "id"));
}
router.get("/groups/:id/form", query(groupFormPage));

async function tabUser(req: Request) {
  const user = await requirePermission("groups.read");
  const id = param(req, "id");
  await assertCanSeeGroup(user, id);
  return { user, id };
}

const rate = (s?: { present: number; total: number }) => (s?.total ? Math.round((s.present / s.total) * 100) : null);

/** Members tab: children (+ attendance rate over 8 weeks) and, for managers, the candidates. */
export async function groupMembersTab(req: Request) {
  const { user, id } = await tabUser(req);
  const canManage = can(user, "groups.manage");
  const [children, stats, candidates] = await Promise.all([groupChildren(id), groupAttendanceStats(id, 8), canManage ? childCandidates(id) : Promise.resolve([])]);
  return {
    // Medical notes stay on the server: the roster only shows a flag.
    children: children.map(({ medicalNotes, ...c }) => ({ ...c, medical: !!medicalNotes, rate: rate(stats.perChild.get(c.id)) })),
    candidates,
  };
}
router.get("/groups/:id/members", query(groupMembersTab));

/** Monitors tab: assignable monitors/staff (managers only). */
export async function groupMonitorsTab(req: Request) {
  const { user, id } = await tabUser(req);
  if (!can(user, "groups.manage")) return { candidates: [] };
  const current = await db.groupMonitor.findMany({ where: { groupId: id }, select: { memberId: true } });
  const taken = new Set(current.map((c) => c.memberId));
  return { candidates: (await monitorCandidates()).filter((m) => !taken.has(m.id)) };
}
router.get("/groups/:id/monitors", query(groupMonitorsTab));

/** Schedule tab: active weekly activities of the group. */
export async function groupScheduleTab(req: Request) {
  const { id } = await tabUser(req);
  const activities = (await groupActivities(id)).filter((a) => a.status === "ACTIVE" && a.dayOfWeek != null);
  return { activities: activities.map((a) => ({ id: a.id, title: a.title, category: a.category, dayOfWeek: a.dayOfWeek, startTime: a.startTime })) };
}
router.get("/groups/:id/schedule", query(groupScheduleTab));

/** Attendance tab: per-session stats over 10 weeks + watch list. */
export async function groupAttendanceTab(req: Request) {
  const { id } = await tabUser(req);
  const [stats, children] = await Promise.all([groupAttendanceStats(id, 10), groupChildren(id)]);
  const ranking = children
    .map((c) => {
      const s = stats.perChild.get(c.id);
      return { id: c.id, firstName: c.firstName, lastName: c.lastName, photoUrl: c.photoUrl, rate: rate(s), total: s?.total ?? 0 };
    })
    .filter((c) => c.rate !== null)
    .sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0));
  return { sessions: stats.sessions, overall: stats.overall, ranking };
}
router.get("/groups/:id/attendance", query(groupAttendanceTab));

/** Activities tab (drafts only for activity managers). */
export async function groupActivitiesTab(req: Request) {
  const { user, id } = await tabUser(req);
  const canCreate = can(user, "activities.manage");
  const activities = await db.activity.findMany({
    where: { groupId: id, ...(canCreate ? {} : { status: { not: "DRAFT" } }) },
    orderBy: [{ status: "asc" }, { dayOfWeek: "asc" }, { startTime: "asc" }],
    include: { group: { select: { id: true, name: true, color: true } }, _count: { select: { participants: true } } },
  });
  return { activities };
}
router.get("/groups/:id/activities", query(groupActivitiesTab));

export async function groupAnnouncementsTab(req: Request) {
  const { id } = await tabUser(req);
  return { items: await groupAnnouncements(id) };
}
router.get("/groups/:id/announcements", query(groupAnnouncementsTab));

export async function groupTasksTab(req: Request) {
  const { id } = await tabUser(req);
  return { tasks: await groupTasks(id) };
}
router.get("/groups/:id/tasks", query(groupTasksTab));

// ── Mutations ──
router.post(
  "/groups",
  mutation((req) => saveGroup(req.body)),
);
router.delete(
  "/groups/:id",
  mutation((req) => deleteGroup(param(req, "id"))),
);
router.post(
  "/groups/:id/children",
  mutation((req) => addChildToGroup(param(req, "id"), String(req.body?.childId ?? ""))),
);
router.delete(
  "/groups/:id/children/:childId",
  mutation((req) => removeChildFromGroup(param(req, "id"), param(req, "childId"))),
);
router.post(
  "/groups/:id/monitors",
  mutation((req) => assignMonitor({ ...req.body, groupId: param(req, "id") })),
);
router.post(
  "/groups/:id/monitors/:memberId/lead",
  mutation((req) => setLeadMonitor(param(req, "id"), param(req, "memberId"))),
);
router.delete(
  "/groups/:id/monitors/:memberId",
  mutation((req) => removeMonitor(param(req, "id"), param(req, "memberId"))),
);
router.post(
  "/groups/:id/tasks",
  mutation((req) => createGroupTask({ ...req.body, groupId: param(req, "id") })),
);

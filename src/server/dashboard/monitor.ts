import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import { addDays, startOfDay } from "@/lib/dates";
import { activitySessions, announcementsFor, groupSessions, latestNotifications, nextOccurrence, sortAgenda } from "./common";

const TASK_ORDER: Record<string, number> = { IN_PROGRESS: 0, TODO: 1, DONE: 2 };

export async function monitorDashboard(user: CurrentUser) {
  const now = new Date();
  const today = startOfDay(now);
  const memberId = user.memberId ?? "__none__";

  const links = await db.groupMonitor.findMany({
    where: { memberId },
    select: {
      isLead: true,
      group: {
        select: {
          id: true,
          name: true,
          color: true,
          icon: true,
          schedule: true,
          meetingDay: true,
          meetingTime: true,
          location: true,
          ageMin: true,
          ageMax: true,
          capacity: true,
          _count: { select: { children: true } },
        },
      },
    },
  });
  const groupIds = links.map((l) => l.group.id);

  const [children, groupMeetings, activities, trips, events, tasks, notifications, announcements, todayRecorded] = await Promise.all([
    db.member.findMany({
      where: { groupId: { in: groupIds }, type: "CHILD", membershipStatus: { not: "INACTIVE" } },
      orderBy: [{ firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, photoUrl: true, dateOfBirth: true, medicalNotes: true, group: { select: { name: true, color: true } } },
    }),
    groupSessions({ id: { in: groupIds } }, today, addDays(today, 8)),
    activitySessions({ OR: [{ monitorId: memberId }, { groupId: { in: groupIds } }] }, today, addDays(today, 8)),
    db.trip.findMany({
      where: { monitors: { some: { memberId } }, returnAt: { gte: now }, status: { not: "CANCELLED" } },
      orderBy: { departAt: "asc" },
      take: 4,
      select: { id: true, title: true, destination: true, departAt: true, coverUrl: true, category: true, capacity: true, _count: { select: { registrations: { where: { status: { in: ["CONFIRMED", "PENDING"] } } } } } },
    }),
    db.event.findMany({
      where: { startAt: { gte: now, lt: addDays(today, 45) }, status: "PUBLISHED" },
      orderBy: { startAt: "asc" },
      take: 4,
      select: { id: true, title: true, startAt: true, location: true, category: true },
    }),
    db.task.findMany({
      where: { assigneeId: user.id },
      orderBy: [{ dueDate: "asc" }],
      take: 12,
      select: { id: true, title: true, description: true, status: true, dueDate: true, group: { select: { name: true, color: true } } },
    }),
    latestNotifications(user.id, 4),
    announcementsFor(["ALL", "MONITORS", "STAFF"], groupIds, 3),
    db.attendance.groupBy({ by: ["groupId"], where: { date: today, groupId: { in: groupIds } }, _count: { _all: true } }),
  ]);

  const recorded = new Set(todayRecorded.map((r) => r.groupId));
  const sessions = sortAgenda([...groupMeetings, ...activities]).map((s) => ({
    ...s,
    isToday: startOfDay(s.at).getTime() === today.getTime(),
    recorded: s.kind === "group" && startOfDay(s.at).getTime() === today.getTime() && recorded.has(s.groupId ?? ""),
  }));

  return {
    groups: links.map((l) => ({ ...l.group, isLead: l.isLead, next: nextOccurrence(l.group.meetingDay, l.group.meetingTime, now) })),
    children,
    sessions: sessions.slice(0, 8),
    todayCount: sessions.filter((s) => s.isToday).length,
    trips,
    events,
    tasks: [...tasks].sort((a, b) => TASK_ORDER[a.status] - TASK_ORDER[b.status]).slice(0, 8),
    openTasks: tasks.filter((t) => t.status !== "DONE").length,
    notifications,
    announcements,
  };
}

import { revalidatePath } from "@api/lib/cache";
import { z } from "zod";
import { db } from "@api/lib/db";
import { AuthError, requirePermission, requireAnyPermission } from "@api/lib/auth/guards";
import { ActionError, formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { TASK_STATUSES } from "@api/lib/constants";
import { canWorkOnGroup } from "./queries";
import { GROUP_COLORS, GROUP_ICONS } from "./constants";

const hhmm = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "errors.validation").optional());

const groupSchema = z
  .object({
    id: zs.optId,
    name: zs.reqStr(80),
    description: zs.optStr,
    color: z.string().refine((c) => (GROUP_COLORS as readonly string[]).includes(c), "errors.validation"),
    icon: z.enum(GROUP_ICONS),
    ageMin: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(0).max(99).optional()),
    ageMax: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(0).max(99).optional()),
    capacity: zs.int(1),
    meetingDay: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(0).max(6).optional()),
    meetingTime: hhmm,
    schedule: zs.optStr,
    location: zs.optStr,
    isActive: zs.bool,
  })
  .refine((d) => d.ageMin == null || d.ageMax == null || d.ageMin <= d.ageMax, { path: ["ageMax"], message: "errors.validation" });

export async function saveGroup(fd: FormData | Record<string, unknown>) {
  const obj = formToObject(fd);
  obj.isActive = obj.isActive ?? false;
  return runAction(groupSchema, obj, async (data) => {
    const user = await requirePermission("groups.manage");
    const { id, ...f } = data;
    const payload = {
      ...f,
      description: f.description ?? null,
      ageMin: f.ageMin ?? null,
      ageMax: f.ageMax ?? null,
      meetingDay: f.meetingDay ?? null,
      meetingTime: f.meetingTime ?? null,
      schedule: f.schedule ?? null,
      location: f.location ?? null,
    };
    if (id) {
      const count = await db.member.count({ where: { groupId: id } });
      if (count > payload.capacity) throw new ActionError("errors.capacityFull");
    }
    const g = id ? await db.group.update({ where: { id }, data: payload }) : await db.group.create({ data: payload });
    await audit(user.id, id ? "update" : "create", "Group", g.id, { name: g.name });
    revalidatePath("/dashboard/groups");
    revalidatePath(`/dashboard/groups/${g.id}`);
    return { id: g.id };
  });
}

export async function deleteGroup(id: string) {
  return runAction(zs.id, id, async (groupId) => {
    const user = await requirePermission("groups.manage");
    const g = await db.group.delete({ where: { id: groupId } });
    await audit(user.id, "delete", "Group", groupId, { name: g.name });
    revalidatePath("/dashboard", "layout");
  });
}

// ── Members (children) ──
export async function addChildToGroup(groupId: string, childId: string) {
  return runAction(z.object({ groupId: zs.id, childId: zs.id }), { groupId, childId }, async (d) => {
    const user = await requirePermission("groups.manage");
    const [group, child, count] = await Promise.all([
      db.group.findUnique({ where: { id: d.groupId } }),
      db.member.findUnique({ where: { id: d.childId } }),
      db.member.count({ where: { groupId: d.groupId } }),
    ]);
    if (!group || !child) throw new ActionError("errors.notFound");
    if (child.type !== "CHILD") throw new ActionError("errors.validation");
    if (child.groupId === d.groupId) throw new ActionError("errors.alreadyRegistered");
    if (count >= group.capacity) throw new ActionError("errors.capacityFull");
    await db.member.update({ where: { id: d.childId }, data: { groupId: d.groupId } });
    await audit(user.id, "add_child", "Group", d.groupId, { childId: d.childId, from: child.groupId });
    revalidatePath(`/dashboard/groups/${d.groupId}`);
    revalidatePath("/dashboard/groups");
  });
}

export async function removeChildFromGroup(groupId: string, childId: string) {
  return runAction(z.object({ groupId: zs.id, childId: zs.id }), { groupId, childId }, async (d) => {
    const user = await requirePermission("groups.manage");
    const res = await db.member.updateMany({ where: { id: d.childId, groupId: d.groupId }, data: { groupId: null } });
    if (!res.count) throw new ActionError("errors.notFound");
    await audit(user.id, "remove_child", "Group", d.groupId, { childId: d.childId });
    revalidatePath(`/dashboard/groups/${d.groupId}`);
    revalidatePath("/dashboard/groups");
  });
}

// ── Monitors ──
const monitorSchema = z.object({ groupId: zs.id, memberId: zs.id, isLead: zs.bool });

export async function assignMonitor(fd: FormData | Record<string, unknown>) {
  const obj = formToObject(fd);
  obj.isLead = obj.isLead ?? false;
  return runAction(monitorSchema, obj, async (d) => {
    const user = await requirePermission("groups.manage");
    const m = await db.member.findUnique({ where: { id: d.memberId } });
    if (!m || !["MONITOR", "STAFF"].includes(m.type)) throw new ActionError("errors.validation");
    await db.$transaction(async (tx) => {
      if (d.isLead) await tx.groupMonitor.updateMany({ where: { groupId: d.groupId }, data: { isLead: false } });
      await tx.groupMonitor.upsert({ where: { groupId_memberId: { groupId: d.groupId, memberId: d.memberId } }, create: d, update: { isLead: d.isLead } });
    });
    await audit(user.id, "assign_monitor", "Group", d.groupId, { memberId: d.memberId, isLead: d.isLead });
    revalidatePath(`/dashboard/groups/${d.groupId}`);
    revalidatePath("/dashboard/groups");
  });
}

export async function setLeadMonitor(groupId: string, memberId: string) {
  return runAction(z.object({ groupId: zs.id, memberId: zs.id }), { groupId, memberId }, async (d) => {
    const user = await requirePermission("groups.manage");
    await db.$transaction([
      db.groupMonitor.updateMany({ where: { groupId: d.groupId }, data: { isLead: false } }),
      db.groupMonitor.update({ where: { groupId_memberId: d }, data: { isLead: true } }),
    ]);
    await audit(user.id, "set_lead", "Group", d.groupId, { memberId: d.memberId });
    revalidatePath(`/dashboard/groups/${d.groupId}`);
  });
}

export async function removeMonitor(groupId: string, memberId: string) {
  return runAction(z.object({ groupId: zs.id, memberId: zs.id }), { groupId, memberId }, async (d) => {
    const user = await requirePermission("groups.manage");
    await db.groupMonitor.delete({ where: { groupId_memberId: d } });
    await audit(user.id, "remove_monitor", "Group", d.groupId, { memberId: d.memberId });
    revalidatePath(`/dashboard/groups/${d.groupId}`);
    revalidatePath("/dashboard/groups");
  });
}

// ── Tasks (groups.manage or the group's monitors) ──
async function requireGroupWorker(groupId: string) {
  const user = await requireAnyPermission("groups.manage", "groups.read");
  if (!(await canWorkOnGroup(user, groupId))) throw new AuthError("FORBIDDEN");
  return user;
}

const taskSchema = z.object({ groupId: zs.id, title: zs.reqStr(160), dueDate: zs.optDate, assigneeId: zs.optId });

export async function createGroupTask(fd: FormData | Record<string, unknown>) {
  return runAction(taskSchema, formToObject(fd), async (d) => {
    const user = await requireGroupWorker(d.groupId);
    if (d.assigneeId && d.assigneeId !== user.id) {
      const ok = await db.groupMonitor.count({ where: { groupId: d.groupId, member: { userId: d.assigneeId } } });
      if (!ok) throw new ActionError("errors.validation");
    }
    const t = await db.task.create({ data: { title: d.title, dueDate: d.dueDate ?? null, groupId: d.groupId, assigneeId: d.assigneeId ?? user.id } });
    await audit(user.id, "create", "Task", t.id, { groupId: d.groupId });
    revalidatePath(`/dashboard/groups/${d.groupId}`);
  });
}

export async function cycleTaskStatus(taskId: string) {
  return runAction(zs.id, taskId, async (id) => {
    const task = await db.task.findUnique({ where: { id } });
    if (!task?.groupId) throw new ActionError("errors.notFound");
    await requireGroupWorker(task.groupId);
    const next = TASK_STATUSES[(TASK_STATUSES.indexOf(task.status as (typeof TASK_STATUSES)[number]) + 1) % TASK_STATUSES.length];
    await db.task.update({ where: { id }, data: { status: next } });
    revalidatePath(`/dashboard/groups/${task.groupId}`);
  });
}

export async function deleteGroupTask(taskId: string) {
  return runAction(zs.id, taskId, async (id) => {
    const task = await db.task.findUnique({ where: { id } });
    if (!task?.groupId) throw new ActionError("errors.notFound");
    const user = await requireGroupWorker(task.groupId);
    await db.task.delete({ where: { id } });
    await audit(user.id, "delete", "Task", id, { groupId: task.groupId });
    revalidatePath(`/dashboard/groups/${task.groupId}`);
  });
}

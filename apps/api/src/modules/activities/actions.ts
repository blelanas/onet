import { revalidatePath } from "@api/lib/cache";
import { z } from "zod";
import { db } from "@api/lib/db";
import { AuthError, can, requirePermission } from "@api/lib/auth/guards";
import { visibleMemberIds } from "@api/lib/auth/scope";
import { ActionError, formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { ACTIVITY_CATEGORIES, ACTIVITY_STATUSES } from "@api/lib/constants";
import { normalizeDay } from "@api/modules/attendance/day";
import { canManageActivity } from "./queries";

const optNum = (min: number, max: number) => z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(min).max(max).optional());

const dayOpt = z.preprocess((v) => (typeof v === "string" && v ? normalizeDay(v) : undefined), z.date().optional());
const dayReq = z.preprocess((v) => (typeof v === "string" && v ? normalizeDay(v) : undefined), z.date({ error: "errors.required" }));

const activitySchema = z
  .object({
    id: zs.optId,
    title: zs.reqStr(140),
    description: zs.optStr,
    category: z.enum(ACTIVITY_CATEGORIES),
    coverUrl: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().regex(/^\/(api\/files|uploads|demo)\//, "errors.validation").optional()),
    ageMin: optNum(0, 99),
    ageMax: optNum(0, 99),
    durationMin: zs.int(5),
    location: zs.optStr,
    materials: zs.optStr,
    monitorId: zs.optId,
    dayOfWeek: optNum(0, 6),
    startTime: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "errors.validation").optional()),
    startDate: dayOpt,
    endDate: dayOpt,
    schedule: zs.optStr,
    capacity: zs.int(1),
    status: z.enum(ACTIVITY_STATUSES),
    groupId: zs.optId,
    eventId: zs.optId,
    isPublic: zs.bool,
  })
  .refine((d) => d.ageMin == null || d.ageMax == null || d.ageMin <= d.ageMax, { path: ["ageMax"], message: "errors.validation" })
  .refine((d) => !d.startDate || !d.endDate || d.startDate <= d.endDate, { path: ["endDate"], message: "errors.validation" });

export async function saveActivity(fd: FormData | Record<string, unknown>) {
  const obj = formToObject(fd);
  obj.isPublic = obj.isPublic ?? false;
  return runAction(activitySchema, obj, async (data) => {
    const user = await requirePermission("activities.manage");
    const { id, ...f } = data;
    const admin = can(user, "members.read_all") || can(user, "groups.manage");
    if (!admin && !f.monitorId && user.memberId) f.monitorId = user.memberId;
    // Scope: the target (and, on update, the existing row) must be manageable by this user.
    if (!(await canManageActivity(user, { monitorId: f.monitorId ?? null, groupId: f.groupId ?? null }))) throw new AuthError("FORBIDDEN");
    if (id) {
      const existing = await db.activity.findUnique({ where: { id }, select: { monitorId: true, groupId: true, _count: { select: { participants: true } } } });
      if (!existing) throw new ActionError("errors.notFound");
      if (!(await canManageActivity(user, existing))) throw new AuthError("FORBIDDEN");
      if (existing._count.participants > f.capacity) throw new ActionError("errors.capacityFull");
    }
    if (f.monitorId && !(await db.member.count({ where: { id: f.monitorId, type: { in: ["MONITOR", "STAFF"] } } }))) throw new ActionError("errors.validation");
    const payload = {
      ...f,
      description: f.description ?? null,
      coverUrl: f.coverUrl ?? null,
      ageMin: f.ageMin ?? null,
      ageMax: f.ageMax ?? null,
      location: f.location ?? null,
      materials: f.materials ?? null,
      monitorId: f.monitorId ?? null,
      dayOfWeek: f.dayOfWeek ?? null,
      startTime: f.startTime ?? null,
      startDate: f.startDate ?? null,
      endDate: f.endDate ?? null,
      schedule: f.schedule ?? null,
      groupId: f.groupId ?? null,
      eventId: f.eventId ?? null,
    };
    const a = id ? await db.activity.update({ where: { id }, data: payload }) : await db.activity.create({ data: payload });
    await audit(user.id, id ? "update" : "create", "Activity", a.id, { title: a.title });
    revalidatePath("/dashboard/activities");
    revalidatePath(`/dashboard/activities/${a.id}`);
    revalidatePath("/dashboard/calendar");
    return { id: a.id };
  });
}

async function loadManageable(activityId: string) {
  const user = await requirePermission("activities.manage");
  const a = await db.activity.findUnique({ where: { id: activityId }, include: { _count: { select: { participants: true } } } });
  if (!a) throw new ActionError("errors.notFound");
  if (!(await canManageActivity(user, a))) throw new AuthError("FORBIDDEN");
  return { user, a };
}

export async function deleteActivity(id: string) {
  return runAction(zs.id, id, async (activityId) => {
    const { user, a } = await loadManageable(activityId);
    const invoices = await db.invoice.count({ where: { activityId } });
    if (invoices) throw new ActionError("errors.inUse");
    await db.activity.delete({ where: { id: activityId } });
    await audit(user.id, "delete", "Activity", activityId, { title: a.title });
    revalidatePath("/dashboard/activities");
    revalidatePath("/dashboard/calendar");
  });
}

export async function enrollChild(activityId: string, memberId: string) {
  return runAction(z.object({ activityId: zs.id, memberId: zs.id }), { activityId, memberId }, async (d) => {
    const { user, a } = await loadManageable(d.activityId);
    const visible = await visibleMemberIds(user);
    if (visible !== "all" && !visible.includes(d.memberId)) throw new AuthError("FORBIDDEN");
    const m = await db.member.findUnique({ where: { id: d.memberId }, select: { type: true } });
    if (m?.type !== "CHILD") throw new ActionError("errors.validation");
    if (a._count.participants >= a.capacity) throw new ActionError("errors.capacityFull");
    const exists = await db.activityParticipant.findUnique({ where: { activityId_memberId: d } });
    if (exists) throw new ActionError("errors.alreadyRegistered");
    await db.activityParticipant.create({ data: d });
    await audit(user.id, "enroll", "Activity", d.activityId, { memberId: d.memberId });
    revalidatePath(`/dashboard/activities/${d.activityId}`);
  });
}

export async function unenrollChild(activityId: string, memberId: string) {
  return runAction(z.object({ activityId: zs.id, memberId: zs.id }), { activityId, memberId }, async (d) => {
    const { user } = await loadManageable(d.activityId);
    await db.activityParticipant.delete({ where: { activityId_memberId: d } });
    await audit(user.id, "unenroll", "Activity", d.activityId, { memberId: d.memberId });
    revalidatePath(`/dashboard/activities/${d.activityId}`);
  });
}

const reportSchema = z.object({ activityId: zs.id, date: dayReq, summary: zs.reqStr(4000) });

export async function addActivityReport(fd: FormData | Record<string, unknown>) {
  return runAction(reportSchema, formToObject(fd), async (d) => {
    const { user } = await loadManageable(d.activityId);
    const r = await db.activityReport.create({ data: { activityId: d.activityId, authorId: user.id, date: d.date, summary: d.summary } });
    await audit(user.id, "create", "ActivityReport", r.id, { activityId: d.activityId });
    revalidatePath(`/dashboard/activities/${d.activityId}`);
  });
}

export async function deleteActivityReport(id: string) {
  return runAction(zs.id, id, async (reportId) => {
    const user = await requirePermission("activities.manage");
    const r = await db.activityReport.findUnique({ where: { id: reportId }, include: { activity: { select: { monitorId: true, groupId: true } } } });
    if (!r) throw new ActionError("errors.notFound");
    if (r.authorId !== user.id && !(can(user, "members.read_all") || can(user, "groups.manage"))) throw new AuthError("FORBIDDEN");
    await db.activityReport.delete({ where: { id: reportId } });
    await audit(user.id, "delete", "ActivityReport", reportId, { activityId: r.activityId });
    revalidatePath(`/dashboard/activities/${r.activityId}`);
  });
}

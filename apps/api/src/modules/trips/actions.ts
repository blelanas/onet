import { revalidatePath } from "@api/lib/cache";
import { z } from "zod";
import { db } from "@api/lib/db";
import { AuthError, can, requireAnyPermission, requirePermission } from "@api/lib/auth/guards";
import { ActionError, formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { TRIP_CATEGORIES, TRIP_STATUSES } from "@api/lib/constants";
import { notifyLocalized } from "@api/modules/registrations/notify";
import { saveRollCall } from "@api/modules/registrations/roll-call";

const optAge = z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(0).max(99).optional());

const tripSchema = z
  .object({
    id: zs.optId,
    title: zs.reqStr(160),
    destination: zs.reqStr(120),
    category: z.enum(TRIP_CATEGORIES),
    description: zs.optStr,
    program: zs.optStr,
    coverUrl: zs.optStr,
    departureLocation: zs.reqStr(200),
    departAt: zs.reqDate,
    returnAt: zs.reqDate,
    capacity: zs.int(1),
    price: zs.money,
    requiredDocuments: zs.optStr,
    registrationDeadline: zs.optDate,
    ageMin: optAge,
    ageMax: optAge,
    status: z.enum(TRIP_STATUSES),
    isPublic: zs.bool,
    monitorIds: z.array(z.string()).optional(),
  })
  .refine((d) => d.returnAt >= d.departAt, { path: ["returnAt"], message: "errors.validation" })
  .refine((d) => d.ageMin == null || d.ageMax == null || d.ageMin <= d.ageMax, { path: ["ageMax"], message: "errors.validation" })
  .refine((d) => !d.registrationDeadline || d.registrationDeadline <= d.departAt, { path: ["registrationDeadline"], message: "errors.validation" });

export async function saveTrip(fd: FormData | Record<string, unknown>) {
  return runAction(tripSchema, formToObject(fd), async ({ id, monitorIds, ...d }) => {
    const user = await requirePermission("trips.manage");
    const data = {
      ...d,
      description: d.description ?? null,
      program: d.program ?? null,
      coverUrl: d.coverUrl ?? null,
      requiredDocuments: d.requiredDocuments ?? null,
      registrationDeadline: d.registrationDeadline ?? null,
      ageMin: d.ageMin ?? null,
      ageMax: d.ageMax ?? null,
    };
    const mids = (monitorIds ?? []).filter(Boolean);
    const trip = await db.$transaction(async (tx) => {
      const t = id ? await tx.trip.update({ where: { id }, data }) : await tx.trip.create({ data });
      await tx.tripMonitor.deleteMany({ where: { tripId: t.id, memberId: { notIn: mids } } });
      for (const memberId of mids) await tx.tripMonitor.upsert({ where: { tripId_memberId: { tripId: t.id, memberId } }, create: { tripId: t.id, memberId }, update: {} });
      return t;
    });
    await audit(user.id, id ? "update" : "create", "Trip", trip.id, { title: trip.title, status: trip.status, price: trip.price });
    revalidatePath("/dashboard/trips");
    revalidatePath(`/dashboard/trips/${trip.id}`);
    return { id: trip.id };
  });
}

export async function deleteTrip(id: string) {
  return runAction(zs.id, id, async (tripId) => {
    const user = await requirePermission("trips.manage");
    const paid = await db.invoice.count({ where: { tripId, status: { in: ["PAID", "PARTIALLY_PAID"] } } });
    if (paid) throw new ActionError("errors.inUse");
    const t = await db.$transaction(async (tx) => {
      await tx.invoice.updateMany({ where: { tripId, status: { in: ["DRAFT", "PENDING", "OVERDUE"] } }, data: { status: "CANCELLED" } });
      return tx.trip.delete({ where: { id: tripId } });
    });
    await audit(user.id, "delete", "Trip", tripId, { title: t.title });
    revalidatePath("/dashboard/trips");
    revalidatePath("/dashboard/registrations");
  });
}

export async function addTripMonitor(fd: FormData | Record<string, unknown>) {
  return runAction(z.object({ tripId: zs.id, memberId: zs.id }), formToObject(fd), async (d) => {
    const user = await requirePermission("trips.manage");
    const [trip, member] = await Promise.all([db.trip.findUnique({ where: { id: d.tripId } }), db.member.findUnique({ where: { id: d.memberId }, select: { userId: true, type: true } })]);
    if (!trip || !member) throw new ActionError("errors.notFound");
    if (member.type === "CHILD") throw new ActionError("errors.validation");
    await db.tripMonitor.upsert({ where: { tripId_memberId: d }, create: d, update: {} });
    await audit(user.id, "assign_monitor", "Trip", d.tripId, { memberId: d.memberId });
    if (member.userId) {
      await notifyLocalized([member.userId], "TRIP_REGISTRATION", `/dashboard/trips/${trip.id}`, (t) => ({ title: t("notify.monitorAssigned", { title: trip.title }) }));
    }
    revalidatePath(`/dashboard/trips/${d.tripId}`);
  });
}

export async function removeTripMonitor(tripId: string, memberId: string) {
  return runAction(z.object({ tripId: zs.id, memberId: zs.id }), { tripId, memberId }, async (d) => {
    const user = await requirePermission("trips.manage");
    await db.tripMonitor.delete({ where: { tripId_memberId: d } });
    await audit(user.id, "remove_monitor", "Trip", d.tripId, { memberId: d.memberId });
    revalidatePath(`/dashboard/trips/${d.tripId}`);
  });
}

/** Departure roll-call (Attendance contextKey "trip:<id>"): staff or the trip's monitors. */
export async function saveTripRollCall(fd: FormData | Record<string, unknown>) {
  return runAction(z.object({ id: zs.id }).passthrough(), formToObject(fd), async (d) => {
    const user = await requireAnyPermission("trips.manage", "attendance.manage");
    const trip = await db.trip.findUnique({ where: { id: d.id }, select: { id: true, departAt: true, monitors: { select: { memberId: true } } } });
    if (!trip) throw new ActionError("errors.notFound");
    if (!can(user, "trips.manage") && !trip.monitors.some((m) => m.memberId === user.memberId)) throw new AuthError("FORBIDDEN");
    const n = await saveRollCall(user, "trip", trip.id, trip.departAt, d as Record<string, unknown>);
    revalidatePath(`/dashboard/trips/${trip.id}`);
    return { count: n };
  });
}

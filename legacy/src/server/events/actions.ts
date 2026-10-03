"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAnyPermission, requirePermission } from "@/lib/auth/guards";
import { ActionError, formToObject, runAction, zs } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { EVENT_CATEGORIES, EVENT_STATUSES } from "@/lib/constants";
import { saveRollCall } from "@/server/registrations/roll-call";

const eventSchema = z
  .object({
    id: zs.optId,
    title: zs.reqStr(160),
    description: zs.optStr,
    category: z.enum(EVENT_CATEGORIES),
    coverUrl: zs.optStr,
    startAt: zs.reqDate,
    endAt: zs.reqDate,
    location: zs.optStr,
    organizer: zs.optStr,
    capacity: zs.int(1),
    registrationDeadline: zs.optDate,
    price: zs.money,
    requiresPayment: zs.bool,
    status: z.enum(EVENT_STATUSES),
    isPublic: zs.bool,
  })
  .refine((d) => d.endAt >= d.startAt, { path: ["endAt"], message: "errors.validation" })
  .refine((d) => !d.registrationDeadline || d.registrationDeadline <= d.startAt, { path: ["registrationDeadline"], message: "errors.validation" });

export async function saveEvent(fd: FormData) {
  return runAction(eventSchema, formToObject(fd), async ({ id, ...d }) => {
    const user = await requirePermission("events.manage");
    const data = {
      ...d,
      description: d.description ?? null,
      coverUrl: d.coverUrl ?? null,
      location: d.location ?? null,
      organizer: d.organizer ?? null,
      registrationDeadline: d.registrationDeadline ?? null,
      requiresPayment: d.price > 0 && d.requiresPayment,
    };
    const e = id ? await db.event.update({ where: { id }, data }) : await db.event.create({ data });
    await audit(user.id, id ? "update" : "create", "Event", e.id, { title: e.title, status: e.status, price: e.price });
    revalidatePath("/dashboard/events");
    revalidatePath(`/dashboard/events/${e.id}`);
    return { id: e.id };
  });
}

export async function deleteEvent(id: string) {
  return runAction(zs.id, id, async (eventId) => {
    const user = await requirePermission("events.manage");
    const paid = await db.invoice.count({ where: { eventId, status: { in: ["PAID", "PARTIALLY_PAID"] } } });
    if (paid) throw new ActionError("errors.inUse");
    const e = await db.$transaction(async (tx) => {
      await tx.invoice.updateMany({ where: { eventId, status: { in: ["DRAFT", "PENDING", "OVERDUE"] } }, data: { status: "CANCELLED" } });
      return tx.event.delete({ where: { id: eventId } });
    });
    await audit(user.id, "delete", "Event", eventId, { title: e.title });
    revalidatePath("/dashboard/events");
    revalidatePath("/dashboard/registrations");
  });
}

/** Event-day check-in (Attendance with contextKey "event:<id>"). */
export async function saveEventCheckIn(fd: FormData) {
  return runAction(z.object({ id: zs.id }).passthrough(), formToObject(fd), async (d) => {
    const user = await requireAnyPermission("events.manage", "attendance.manage");
    const event = await db.event.findUnique({ where: { id: d.id }, select: { id: true, startAt: true } });
    if (!event) throw new ActionError("errors.notFound");
    const n = await saveRollCall(user, "event", event.id, event.startAt, d as Record<string, unknown>);
    revalidatePath(`/dashboard/events/${event.id}`);
    return { count: n };
  });
}

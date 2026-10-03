"use server";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthError, can, requireAnyPermission, requirePermission } from "@/lib/auth/guards";
import { ActionError, formToObject, runAction, zs } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { DOCUMENTS_STATUSES } from "@/lib/constants";
import { cancelRegistration, registerForEvent, registerForTrip, setRegistrationStatus, type RegisterResult, type RegKind } from "./service";

const kindSchema = z.enum(["event", "trip"]);

function revalidateTarget(kind: RegKind, targetId?: string) {
  if (targetId) revalidatePath(`/dashboard/${kind === "event" ? "events" : "trips"}/${targetId}`);
  revalidatePath(`/dashboard/${kind === "event" ? "events" : "trips"}`);
  revalidatePath("/dashboard/registrations");
}

async function currentUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  return user;
}

const registerSchema = z.object({
  kind: kindSchema,
  targetId: zs.id,
  memberIds: z.array(z.string().min(1)).min(1, "errors.required").max(20),
  parentConsent: zs.bool.optional(),
  notes: zs.optStr,
});

/** Family (or staff) registration of one or several members. */
export async function registerMembers(fd: FormData) {
  return runAction(registerSchema, formToObject(fd), async (d) => {
    const user = await currentUser();
    const results: RegisterResult[] = [];
    let firstError: unknown = null;
    for (const memberId of [...new Set(d.memberIds)]) {
      try {
        results.push(d.kind === "event" ? await registerForEvent(user, d.targetId, memberId, { notes: d.notes }) : await registerForTrip(user, d.targetId, memberId, { parentConsent: d.parentConsent, notes: d.notes }));
      } catch (e) {
        firstError ??= e;
      }
    }
    if (!results.length) throw firstError ?? new ActionError("errors.unexpected");
    revalidateTarget(d.kind, d.targetId);
    return { results, failed: d.memberIds.length - results.length };
  }).then(async (res) => {
    if (!res.ok || !res.data) return res;
    const t = await getTranslations("events");
    const waitlisted = res.data.results.filter((r) => r.status === "WAITLIST").length;
    const message = res.data.failed ? t("register.partial", { ok: res.data.results.length, failed: res.data.failed }) : waitlisted ? t("register.waitlisted") : t("register.success", { count: res.data.results.length });
    return { ...res, message };
  });
}

/** Staff adds a participant (bypasses the registration window and deadline, still capacity-aware). */
export async function addParticipant(fd: FormData) {
  const schema = z.object({ kind: kindSchema, targetId: zs.id, memberId: zs.id, parentConsent: zs.bool.optional(), notes: zs.optStr });
  return runAction(schema, formToObject(fd), async (d) => {
    const user = await requirePermission("registrations.manage");
    const r = d.kind === "event" ? await registerForEvent(user, d.targetId, d.memberId, { notes: d.notes }) : await registerForTrip(user, d.targetId, d.memberId, { parentConsent: d.parentConsent, notes: d.notes });
    revalidateTarget(d.kind, d.targetId);
    return r;
  });
}

export async function cancelRegistrationAction(kind: RegKind, id: string) {
  return runAction(z.object({ kind: kindSchema, id: zs.id }), { kind, id }, async (d) => {
    const user = await currentUser();
    const r = await cancelRegistration(user, d.kind, d.id);
    revalidateTarget(d.kind);
    revalidatePath("/dashboard", "layout");
    return r;
  }).then(async (res) => {
    if (!res.ok) return res;
    const t = await getTranslations("events");
    return { ...res, message: res.data?.refundNeeded ? t("cancel.refund") : "toast.cancelled" };
  });
}

export async function setRegistrationStatusAction(kind: RegKind, id: string, status: "CONFIRMED" | "WAITLIST" | "PENDING") {
  return runAction(z.object({ kind: kindSchema, id: zs.id, status: z.enum(["CONFIRMED", "WAITLIST", "PENDING"]) }), { kind, id, status }, async (d) => {
    const user = await requirePermission("registrations.manage");
    await setRegistrationStatus(user, d.kind, d.id, d.status);
    revalidateTarget(d.kind);
    revalidatePath("/dashboard", "layout");
  });
}

const bulkSchema = z.object({
  op: z.enum(["CONFIRMED", "WAITLIST", "CANCELLED"]),
  ids: z.array(z.string().regex(/^(event|trip):[\w-]+$/)).min(1, "errors.required").max(200),
});

/** Bulk status change from the registrations console. Value format: "<kind>:<id>". */
export async function bulkRegistrations(fd: FormData) {
  return runAction(bulkSchema, formToObject(fd), async (d) => {
    const user = await requirePermission("registrations.manage");
    let done = 0;
    for (const v of new Set(d.ids)) {
      const [kind, id] = v.split(":") as [RegKind, string];
      try {
        if (d.op === "CANCELLED") await cancelRegistration(user, kind, id);
        else await setRegistrationStatus(user, kind, id, d.op);
        done++;
      } catch (e) {
        console.error("[bulkRegistrations]", v, e);
      }
    }
    await audit(user.id, "bulk_status", "Registration", null, { op: d.op, count: done });
    revalidatePath("/dashboard", "layout");
    return { done };
  }).then(async (res) => {
    if (!res.ok) return res;
    const t = await getTranslations("events");
    return { ...res, message: t("bulk.done", { count: res.data?.done ?? 0 }) };
  });
}

/** Staff/monitor follow-up on a trip registration: consent + documents. */
export async function updateTripRegistration(id: string, patch: { parentConsent?: boolean; documentsStatus?: string }) {
  const schema = z.object({ id: zs.id, parentConsent: z.boolean().optional(), documentsStatus: z.enum(DOCUMENTS_STATUSES).optional() });
  return runAction(schema, { id, ...patch }, async (d) => {
    const user = await requireAnyPermission("registrations.manage", "trips.manage", "attendance.manage");
    const reg = await db.tripRegistration.findUnique({ where: { id: d.id }, select: { tripId: true } });
    if (!reg) throw new AuthError("NOT_FOUND");
    if (!can(user, "registrations.manage") && !can(user, "trips.manage")) {
      // Monitors may only update trips they supervise.
      const sup = user.memberId ? await db.tripMonitor.count({ where: { tripId: reg.tripId, memberId: user.memberId } }) : 0;
      if (!sup) throw new AuthError("FORBIDDEN");
    }
    await db.tripRegistration.update({ where: { id: d.id }, data: { parentConsent: d.parentConsent, documentsStatus: d.documentsStatus } });
    await audit(user.id, "update", "TripRegistration", d.id, { parentConsent: d.parentConsent, documentsStatus: d.documentsStatus });
    revalidatePath(`/dashboard/trips/${reg.tripId}`);
  });
}

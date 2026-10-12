import { revalidatePath } from "@api/lib/cache";
import { z } from "zod";
import { db } from "@api/lib/db";
import { getTranslations } from "@api/lib/i18n";
import type { CurrentUser } from "@api/lib/auth/session";
import { AuthError, requirePermission, requireUser } from "@api/lib/auth/guards";
import { ActionError, formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { formatMoney, GUARDIAN_RELATIONS } from "@onet/shared";
import { nextMembershipNumber } from "@api/modules/members/actions";
import { normalizePhone } from "@api/modules/signup/lib";
import { MANUAL_PAYMENT_METHODS, recordManualPayment } from "@api/modules/finance/manual-payment";
import { notifyLocalized, roleUserIds } from "@api/modules/registrations/notify";
import { cancelRegistration, registerForTrip } from "@api/modules/registrations/service";
import { requireTripManager } from "./access";
import { tripParticipantRows, tripTotals } from "./participants";

type TripErrorKey = "listClosed" | "notClosed" | "notParticipant" | "noInvoice" | "memberType";

/** Domain error rendered in the request language (trips.errors.*). */
async function tripError(key: TripErrorKey): Promise<never> {
  const t = await getTranslations("trips.errors");
  throw new ActionError(t(key));
}

/** Once the list is finalized it is frozen (an admin reopens it first). */
async function assertListOpen(trip: { listClosedAt: Date | null }) {
  if (trip.listClosedAt) await tripError("listClosed");
}

function revalidateTrip(tripId: string) {
  revalidatePath(`/dashboard/trips/${tripId}`);
  revalidatePath("/dashboard/registrations");
}

const optName = z.preprocess((v) => (typeof v === "string" ? (v.trim() === "" ? undefined : v.trim()) : v), z.string().max(80).optional());
const optPhone = z.preprocess((v) => (typeof v === "string" ? (v.trim() === "" ? undefined : v.trim()) : v), z.string().max(30).optional());

const addSchema = z
  .object({
    tripId: zs.id,
    memberId: zs.optId,
    firstName: optName,
    lastName: optName,
    dateOfBirth: zs.optDate,
    phone: optPhone,
    parentName: z.preprocess((v) => (typeof v === "string" ? (v.trim() === "" ? undefined : v.trim()) : v), z.string().max(120).optional()),
    parentPhone: optPhone,
    parentRelation: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.enum(GUARDIAN_RELATIONS).optional()),
    notes: z.preprocess((v) => (typeof v === "string" ? (v.trim() === "" ? undefined : v.trim()) : v), z.string().max(500).optional()),
  })
  .superRefine((d, ctx) => {
    if (d.memberId) return;
    // A new person: name and date of birth (for the age) are required.
    for (const k of ["firstName", "lastName", "dateOfBirth"] as const) if (!d[k]) ctx.addIssue({ code: "custom", path: [k], message: "errors.required" });
    if (d.dateOfBirth && (Number.isNaN(d.dateOfBirth.getTime()) || d.dateOfBirth > new Date())) ctx.addIssue({ code: "custom", path: ["dateOfBirth"], message: "errors.validation" });
    for (const k of ["phone", "parentPhone"] as const) if (d[k] && !normalizePhone(d[k])) ctx.addIssue({ code: "custom", path: [k], message: "errors.phone" });
    if (d.parentPhone && !d.parentName) ctx.addIssue({ code: "custom", path: ["parentName"], message: "errors.required" });
  });

/** "Leila Ben Salah" → first name "Leila", last name "Ben Salah" (single word: used for both). */
function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? { firstName: parts[0]!, lastName: parts.slice(1).join(" ") } : { firstName: parts[0]!, lastName: parts[0]! };
}

/** Existing parent contact with the same phone number (any formatting), to avoid duplicate families. */
async function findParentByPhone(phone: string) {
  const wanted = normalizePhone(phone);
  if (!wanted) return null;
  const parents = await db.member.findMany({ where: { type: "PARENT", phone: { not: null } }, select: { id: true, phone: true } });
  return parents.find((p) => normalizePhone(p.phone) === wanted)?.id ?? null;
}

/**
 * New person added by a manager: a CHILD member (no login) and, when parent details are given, a PARENT
 * contact (no login; reused when the phone matches an existing parent) linked as primary guardian.
 */
async function createPerson(d: z.infer<typeof addSchema>) {
  const parentId = d.parentName ? (d.parentPhone ? await findParentByPhone(d.parentPhone) : null) : null;
  return db.$transaction(async (tx) => {
    const child = await tx.member.create({
      data: { type: "CHILD", firstName: d.firstName!, lastName: d.lastName!, dateOfBirth: d.dateOfBirth!, phone: d.phone ?? null, membershipNumber: await nextMembershipNumber(tx), membershipStatus: "ACTIVE" },
    });
    if (d.parentName) {
      const pid =
        parentId ??
        (await tx.member.create({ data: { type: "PARENT", ...splitName(d.parentName), phone: d.parentPhone ?? null, membershipNumber: await nextMembershipNumber(tx), membershipStatus: "ACTIVE" } })).id;
      await tx.guardianship.create({ data: { parentId: pid, childId: child.id, relation: d.parentRelation ?? "PARENT", isPrimary: true } });
    }
    return child.id;
  });
}

/** Manager adds a participant: an existing kid / member, or a new person (created on the fly). */
export async function addTripParticipant(fd: FormData | Record<string, unknown>) {
  return runAction(addSchema, formToObject(fd), async (d) => {
    const user = await requireUser();
    const trip = await requireTripManager(user, d.tripId);
    await assertListOpen(trip);
    let memberId = d.memberId;
    if (memberId) {
      const m = await db.member.findUnique({ where: { id: memberId }, select: { type: true } });
      if (!m) throw new AuthError("NOT_FOUND");
      if (!["CHILD", "MEMBER", "MONITOR"].includes(m.type)) await tripError("memberType");
    } else {
      memberId = await createPerson(d);
      await audit(user.id, "create", "Member", memberId, { via: "trip", tripId: d.tripId, parent: !!d.parentName });
    }
    const r = await registerForTrip(user, d.tripId, memberId, { manager: true, notes: d.notes });
    revalidateTrip(d.tripId);
    return r;
  }).then(async (res) => {
    if (!res.ok || !res.data) return res;
    const t = await getTranslations("trips.manage");
    return { ...res, message: res.data.status === "WAITLIST" ? t("addedWaitlist") : t("added") };
  });
}

async function tripRegistration(tripId: string, registrationId: string) {
  const reg = await db.tripRegistration.findUnique({ where: { id: registrationId }, select: { id: true, tripId: true, status: true, invoiceId: true } });
  if (!reg || reg.tripId !== tripId) await tripError("notParticipant");
  return reg!;
}

/** Manager removes a participant (the registration is cancelled: unpaid invoice cancelled, paid one flagged for refund). */
export async function removeTripParticipant(tripId: string, registrationId: string) {
  return runAction(z.object({ tripId: zs.id, registrationId: zs.id }), { tripId, registrationId }, async (d) => {
    const user = await requireUser();
    const trip = await requireTripManager(user, d.tripId);
    await assertListOpen(trip);
    await tripRegistration(d.tripId, d.registrationId);
    const r = await cancelRegistration(user, "trip", d.registrationId, { manager: true });
    revalidateTrip(d.tripId);
    return r;
  }).then(async (res) => {
    if (!res.ok) return res;
    const t = await getTranslations("events");
    return { ...res, message: res.data?.refundNeeded ? t("cancel.refund") : "toast.cancelled" };
  });
}

const paymentSchema = z.object({
  tripId: zs.id,
  registrationId: zs.id,
  amount: zs.money.refine((v) => v > 0, "errors.required"),
  method: z.preprocess((v) => (v === "" || v == null ? "CASH" : v), z.enum(MANUAL_PAYMENT_METHODS)),
  note: zs.optStr,
});

/** Manager records a payment on a participant's invoice (≤ remaining balance), then the invoice is settled. */
export async function recordTripPayment(fd: FormData | Record<string, unknown>) {
  return runAction(paymentSchema, formToObject(fd), async (d) => {
    const user = await requireUser();
    await requireTripManager(user, d.tripId);
    const reg = await tripRegistration(d.tripId, d.registrationId);
    if (reg.status === "CANCELLED") await tripError("notParticipant");
    if (!reg.invoiceId) await tripError("noInvoice");
    const r = await recordManualPayment(user, { invoiceId: reg.invoiceId!, amount: d.amount, method: d.method, notes: d.note ?? null });
    revalidateTrip(d.tripId);
    return r;
  });
}

/** Sends the finalized list to the accountants (and admins), each in their own language. */
async function notifyFinalized(user: CurrentUser, trip: { id: string; title: string }, totals: { participants: number; collected: number; outstanding: number }) {
  const ids = (await roleUserIds(["accountant", "admin", "super_admin"])).filter((id) => id !== user.id);
  await notifyLocalized(
    ids,
    "TRIP_REGISTRATION",
    `/dashboard/trips/${trip.id}/report`,
    (t, locale) => ({
      title: t("finalizedTitle", { title: trip.title }),
      body: t("finalizedBody", { count: totals.participants, collected: formatMoney(totals.collected, locale), outstanding: formatMoney(totals.outstanding, locale), name: user.name }),
    }),
    "trips.notify",
  );
}

/** Manager finalizes the participant list: it is frozen and the accountants receive the report. */
export async function finalizeTripList(tripId: string) {
  return runAction(zs.id, tripId, async (id) => {
    const user = await requireUser();
    const trip = await requireTripManager(user, id);
    await assertListOpen(trip);
    const now = new Date();
    // Conditional update: two managers finalizing at once notify only once.
    const { count } = await db.trip.updateMany({ where: { id, listClosedAt: null }, data: { listClosedAt: now, listClosedById: user.id } });
    if (!count) await tripError("listClosed");
    const totals = tripTotals(await tripParticipantRows(id));
    await audit(user.id, "finalize_list", "Trip", id, { participants: totals.participants, expected: totals.expected, collected: totals.collected, outstanding: totals.outstanding });
    await notifyFinalized(user, trip, totals);
    revalidateTrip(id);
    return { closedAt: now, ...totals };
  }).then(async (res) => {
    if (!res.ok) return res;
    const t = await getTranslations("trips.manage");
    return { ...res, message: t("finalized") };
  });
}

/** Admin reopens a finalized list (managers can then edit it and finalize again). */
export async function reopenTripList(tripId: string) {
  return runAction(zs.id, tripId, async (id) => {
    const user = await requirePermission("trips.manage");
    const trip = await db.trip.findUnique({ where: { id }, select: { listClosedAt: true } });
    if (!trip) throw new AuthError("NOT_FOUND");
    if (!trip.listClosedAt) await tripError("notClosed");
    await db.trip.update({ where: { id }, data: { listClosedAt: null, listClosedById: null } });
    await audit(user.id, "reopen_list", "Trip", id);
    revalidateTrip(id);
  });
}

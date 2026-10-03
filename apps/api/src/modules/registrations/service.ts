import type { Prisma } from "@prisma/client";
import { getTranslations } from "@api/lib/i18n";
import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { AuthError, can } from "@api/lib/auth/guards";
import { registrableMemberIds } from "@api/lib/auth/scope";
import { ActionError } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { nextInvoiceNumber } from "@api/lib/services/invoices";
import { guardianUserIds, notifyLocalized, roleUserIds } from "./notify";

export type RegKind = "event" | "trip";
type Tx = Prisma.TransactionClient;

/** Statuses that occupy a place (waitlist and cancelled do not). */
export const ACTIVE_STATUSES = ["PENDING", "CONFIRMED"];
const UNPAID_INVOICE = ["DRAFT", "PENDING", "OVERDUE"];
const PAID_INVOICE = ["PAID", "PARTIALLY_PAID"];

/** Reasons a member cannot be registered (i18n keys under events.eligibility.*). */
export type IneligibleReason = "closed" | "deadline" | "tooYoung" | "tooOld" | "registered";

/** Normalised view of an event or trip for the registration rules. */
export type RegTarget = {
  kind: RegKind;
  id: string;
  title: string;
  status: string;
  startAt: Date;
  deadline: Date | null;
  capacity: number;
  price: number;
  requiresPayment: boolean;
  ageMin: number | null;
  ageMax: number | null;
  link: string;
};

export async function loadTarget(kind: RegKind, id: string, tx: Tx | typeof db = db): Promise<RegTarget> {
  if (kind === "event") {
    const e = await tx.event.findUnique({ where: { id } });
    if (!e) throw new AuthError("NOT_FOUND");
    return { kind, id, title: e.title, status: e.status, startAt: e.startAt, deadline: e.registrationDeadline, capacity: e.capacity, price: e.price, requiresPayment: e.requiresPayment || e.price > 0, ageMin: null, ageMax: null, link: `/dashboard/events/${id}` };
  }
  const t = await tx.trip.findUnique({ where: { id } });
  if (!t) throw new AuthError("NOT_FOUND");
  return { kind, id, title: t.title, status: t.status, startAt: t.departAt, deadline: t.registrationDeadline, capacity: t.capacity, price: t.price, requiresPayment: t.price > 0, ageMin: t.ageMin, ageMax: t.ageMax, link: `/dashboard/trips/${id}` };
}

/** Registration window is open (published event / open-or-full trip, not past). */
export function isOpen(target: RegTarget, now = new Date()) {
  const okStatus = target.kind === "event" ? target.status === "PUBLISHED" : target.status === "OPEN" || target.status === "FULL";
  return okStatus && target.startAt > now;
}

export function deadlinePassed(target: RegTarget, now = new Date()) {
  return !!target.deadline && target.deadline < now;
}

/** Age check against the day of the event/trip. */
export function ageIssue(target: RegTarget, dob: Date | null): "tooYoung" | "tooOld" | null {
  if (!dob || (target.ageMin == null && target.ageMax == null)) return null;
  const at = new Date(target.startAt);
  let age = at.getFullYear() - dob.getFullYear();
  const m = at.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < dob.getDate())) age--;
  if (target.ageMin != null && age < target.ageMin) return "tooYoung";
  if (target.ageMax != null && age > target.ageMax) return "tooOld";
  return null;
}

/** Eligibility of a member for a target, ignoring capacity (a full target just means waitlist). */
export function eligibility(target: RegTarget, member: { dateOfBirth: Date | null }, existingStatus: string | null, staff = false): IneligibleReason | null {
  if (existingStatus && existingStatus !== "CANCELLED") return "registered";
  if (!staff && !isOpen(target)) return "closed";
  if (!staff && deadlinePassed(target)) return "deadline";
  return ageIssue(target, member.dateOfBirth);
}

const COMMON_ERRORS: Partial<Record<IneligibleReason, string>> = { deadline: "errors.deadlinePassed", registered: "errors.alreadyRegistered" };

async function fail(reason: IneligibleReason | "consent"): Promise<never> {
  const common = COMMON_ERRORS[reason as IneligibleReason];
  if (common) throw new ActionError(common);
  const t = await getTranslations("events");
  throw new ActionError(t(`errors.${reason}`));
}

/** Payer of an invoice for a member: primary guardian, else any guardian, else the member. */
async function payerFor(tx: Tx, memberId: string) {
  const links = await tx.guardianship.findMany({ where: { childId: memberId }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }], select: { parentId: true } });
  return links[0]?.parentId ?? memberId;
}

async function countActive(tx: Tx, target: RegTarget) {
  return target.kind === "event"
    ? tx.eventRegistration.count({ where: { eventId: target.id, status: { in: ACTIVE_STATUSES } } })
    : tx.tripRegistration.count({ where: { tripId: target.id, status: { in: ACTIVE_STATUSES } } });
}

async function createInvoice(tx: Tx, target: RegTarget, memberId: string, memberName: string) {
  const t = await getTranslations({ locale: "fr", namespace: "events" });
  return tx.invoice.create({
    data: {
      number: await nextInvoiceNumber(tx),
      description: t(target.kind === "event" ? "invoice.event" : "invoice.trip", { title: target.title, name: memberName }),
      amount: target.price,
      payerId: await payerFor(tx, memberId),
      childId: memberId,
      eventId: target.kind === "event" ? target.id : null,
      tripId: target.kind === "trip" ? target.id : null,
      dueDate: target.deadline ?? target.startAt,
      status: "PENDING",
    },
  });
}

/** Status a (non-waitlisted) registration should have given its invoice. */
function statusFor(target: RegTarget, invoice: { status: string } | null) {
  if (!invoice || target.price === 0) return "CONFIRMED";
  if (invoice.status === "PAID") return "CONFIRMED";
  // Events that don't require advance payment are confirmed right away (pay on site / later).
  if (target.kind === "event" && !target.requiresPayment) return "CONFIRMED";
  return "PENDING";
}

/**
 * Ensures a place-holding registration has a live invoice when the target has a price.
 * Reuses a still-valid (pending or paid) invoice; otherwise issues a new one.
 */
async function ensureInvoice(tx: Tx, target: RegTarget, memberId: string, memberName: string, currentInvoiceId: string | null) {
  if (target.price === 0) return null;
  if (currentInvoiceId) {
    const inv = await tx.invoice.findUnique({ where: { id: currentInvoiceId } });
    if (inv && inv.status !== "CANCELLED") return inv;
  }
  return createInvoice(tx, target, memberId, memberName);
}

export type RegisterResult = { id: string; status: string; invoiceId: string | null; memberId: string };

async function assertCanRegister(user: CurrentUser, kind: RegKind, memberId: string) {
  const staff = can(user, "registrations.manage");
  if (!staff && !can(user, kind === "event" ? "events.register" : "trips.register")) throw new AuthError("FORBIDDEN");
  const allowed = await registrableMemberIds(user);
  if (allowed !== "all" && !allowed.includes(memberId)) throw new AuthError("FORBIDDEN");
  return staff;
}

async function register(user: CurrentUser, kind: RegKind, targetId: string, memberId: string, opts: { parentConsent?: boolean; notes?: string } = {}): Promise<RegisterResult> {
  const staff = await assertCanRegister(user, kind, memberId);
  const member = await db.member.findUnique({ where: { id: memberId }, select: { id: true, firstName: true, lastName: true, dateOfBirth: true, type: true } });
  if (!member) throw new AuthError("NOT_FOUND");
  // Parents must give consent for a trip; staff may record it later.
  if (kind === "trip" && !staff && !opts.parentConsent) await fail("consent");

  const memberName = `${member.firstName} ${member.lastName}`;
  const result = await db.$transaction(async (tx) => {
    const target = await loadTarget(kind, targetId, tx);
    const existing =
      kind === "event"
        ? await tx.eventRegistration.findUnique({ where: { eventId_memberId: { eventId: targetId, memberId } } })
        : await tx.tripRegistration.findUnique({ where: { tripId_memberId: { tripId: targetId, memberId } } });
    const reason = eligibility(target, member, existing?.status ?? null, staff);
    if (reason) await fail(reason);

    const full = (await countActive(tx, target)) >= target.capacity;
    let status = "WAITLIST";
    let invoiceId: string | null = null;
    if (!full) {
      const inv = await ensureInvoice(tx, target, memberId, memberName, existing?.invoiceId ?? null);
      invoiceId = inv?.id ?? null;
      status = statusFor(target, inv);
    }
    const base = { status, invoiceId, registeredById: user.id, notes: opts.notes ?? null };
    let reg: { id: string };
    if (kind === "event") {
      reg = existing
        ? await tx.eventRegistration.update({ where: { id: existing.id }, data: base })
        : await tx.eventRegistration.create({ data: { ...base, eventId: targetId, memberId } });
    } else {
      const tripData = { ...base, parentConsent: !!opts.parentConsent };
      reg = existing
        ? await tx.tripRegistration.update({ where: { id: existing.id }, data: tripData })
        : await tx.tripRegistration.create({ data: { ...tripData, tripId: targetId, memberId } });
      // Keep the trip status in sync with its capacity.
      if (!full && target.status === "OPEN" && (await countActive(tx, target)) >= target.capacity) await tx.trip.update({ where: { id: targetId }, data: { status: "FULL" } });
    }
    return { reg, status, invoiceId, target };
  });

  const { target } = result;
  await audit(user.id, "register", kind === "event" ? "EventRegistration" : "TripRegistration", result.reg.id, { targetId, memberId, status: result.status, invoiceId: result.invoiceId });
  const guardians = await guardianUserIds(memberId);
  await notifyLocalized(guardians, kind === "event" ? "EVENT_NEW" : "TRIP_REGISTRATION", target.link, (t) => ({
    title: t(`notify.registered.${result.status}`, { name: member.firstName, title: target.title }),
    body: t(result.invoiceId && result.status === "PENDING" ? "notify.payBody" : "notify.registeredBody", { title: target.title }),
  }));
  if (kind === "trip") {
    const staffIds = (await roleUserIds(["admin", "super_admin"])).filter((id) => id !== user.id);
    await notifyLocalized(staffIds, "TRIP_REGISTRATION", `${target.link}?tab=participants`, (t) => ({
      title: t("notify.staffNew", { name: memberName, title: target.title }),
      body: t(`notify.staffStatus.${result.status}`),
    }));
  }
  return { id: result.reg.id, status: result.status, invoiceId: result.invoiceId, memberId };
}

export function registerForEvent(user: CurrentUser, eventId: string, memberId: string, opts: { notes?: string } = {}) {
  return register(user, "event", eventId, memberId, opts);
}

export function registerForTrip(user: CurrentUser, tripId: string, memberId: string, opts: { parentConsent?: boolean; notes?: string } = {}) {
  return register(user, "trip", tripId, memberId, opts);
}

type RegRow = { id: string; memberId: string; status: string; invoiceId: string | null; notes: string | null; targetId: string };

async function loadRegistration(kind: RegKind, id: string, tx: Tx | typeof db = db): Promise<RegRow> {
  const r =
    kind === "event"
      ? await tx.eventRegistration.findUnique({ where: { id } }).then((x) => x && { ...x, targetId: x.eventId })
      : await tx.tripRegistration.findUnique({ where: { id } }).then((x) => x && { ...x, targetId: x.tripId });
  if (!r) throw new AuthError("NOT_FOUND");
  return r;
}

async function updateReg(tx: Tx, kind: RegKind, id: string, data: { status?: string; invoiceId?: string | null; notes?: string | null }) {
  return kind === "event" ? tx.eventRegistration.update({ where: { id }, data }) : tx.tripRegistration.update({ where: { id }, data });
}

/** Owner/guardian (with the register permission) or staff. */
export async function assertCanEditRegistration(user: CurrentUser, kind: RegKind, memberId: string) {
  if (can(user, "registrations.manage")) return true;
  if (!can(user, kind === "event" ? "events.register" : "trips.register")) throw new AuthError("FORBIDDEN");
  const allowed = await registrableMemberIds(user);
  if (allowed !== "all" && !allowed.includes(memberId)) throw new AuthError("FORBIDDEN");
  return false;
}

/** Promotes the oldest waitlisted registrations while places are free. Returns promoted ids. */
// `excludeId`: a registration staff just moved to the waitlist must not be promoted straight back.
async function promoteWaitlist(tx: Tx, target: RegTarget, excludeId?: string) {
  const promoted: { id: string; memberId: string; status: string; name: string }[] = [];
  let free = target.capacity - (await countActive(tx, target));
  if (free <= 0) return promoted;
  const waiting =
    target.kind === "event"
      ? await tx.eventRegistration.findMany({ where: { eventId: target.id, status: "WAITLIST", ...(excludeId ? { id: { not: excludeId } } : {}) }, orderBy: { createdAt: "asc" }, take: free, include: { member: { select: { firstName: true, lastName: true } } } })
      : await tx.tripRegistration.findMany({ where: { tripId: target.id, status: "WAITLIST", ...(excludeId ? { id: { not: excludeId } } : {}) }, orderBy: { createdAt: "asc" }, take: free, include: { member: { select: { firstName: true, lastName: true } } } });
  for (const w of waiting) {
    if (free-- <= 0) break;
    const name = `${w.member.firstName} ${w.member.lastName}`;
    const inv = await ensureInvoice(tx, target, w.memberId, name, w.invoiceId);
    const status = statusFor(target, inv);
    await updateReg(tx, target.kind, w.id, { status, invoiceId: inv?.id ?? null });
    promoted.push({ id: w.id, memberId: w.memberId, status, name: w.member.firstName });
  }
  return promoted;
}

async function notifyPromoted(target: RegTarget, promoted: { memberId: string; status: string; name: string }[]) {
  for (const p of promoted) {
    await notifyLocalized(await guardianUserIds(p.memberId), target.kind === "event" ? "EVENT_NEW" : "TRIP_REGISTRATION", target.link, (t) => ({
      title: t("notify.promoted", { name: p.name, title: target.title }),
      body: t(p.status === "PENDING" ? "notify.payBody" : "notify.registeredBody", { title: target.title }),
    }));
  }
}

/**
 * Cancels a registration. Unpaid invoices are cancelled; paid ones are kept (refund is handled by
 * finance, who get notified). Frees the place and promotes the waitlist.
 */
export async function cancelRegistration(user: CurrentUser, kind: RegKind, registrationId: string) {
  const reg = await loadRegistration(kind, registrationId);
  const staff = await assertCanEditRegistration(user, kind, reg.memberId);
  if (reg.status === "CANCELLED") return { refundNeeded: false };
  const tFr = await getTranslations({ locale: "fr", namespace: "events" });

  const out = await db.$transaction(async (tx) => {
    const target = await loadTarget(kind, reg.targetId, tx);
    let refundNeeded = false;
    let notes = reg.notes;
    if (reg.invoiceId) {
      const inv = await tx.invoice.findUnique({ where: { id: reg.invoiceId } });
      if (inv && UNPAID_INVOICE.includes(inv.status)) {
        await tx.invoice.update({ where: { id: inv.id }, data: { status: "CANCELLED", notes: [inv.notes, tFr("invoice.cancelledNote")].filter(Boolean).join("\n") } });
      } else if (inv && PAID_INVOICE.includes(inv.status)) {
        refundNeeded = true;
        notes = [reg.notes, tFr("invoice.refundNote", { number: inv.number })].filter(Boolean).join("\n");
      }
    }
    await updateReg(tx, kind, reg.id, { status: "CANCELLED", notes });
    const promoted = ACTIVE_STATUSES.includes(reg.status) ? await promoteWaitlist(tx, target) : [];
    if (kind === "trip" && target.status === "FULL" && (await countActive(tx, target)) < target.capacity) await tx.trip.update({ where: { id: target.id }, data: { status: "OPEN" } });
    return { target, promoted, refundNeeded };
  });

  await audit(user.id, "cancel", kind === "event" ? "EventRegistration" : "TripRegistration", reg.id, { memberId: reg.memberId, by: staff ? "staff" : "family", refundNeeded: out.refundNeeded });
  const member = await db.member.findUnique({ where: { id: reg.memberId }, select: { firstName: true, lastName: true } });
  const recipients = (await guardianUserIds(reg.memberId)).filter((id) => id !== user.id);
  await notifyLocalized(recipients, kind === "event" ? "EVENT_NEW" : "TRIP_REGISTRATION", out.target.link, (t) => ({ title: t("notify.cancelled", { name: member?.firstName ?? "", title: out.target.title }) }));
  if (out.refundNeeded) {
    await notifyLocalized(await roleUserIds(["accountant"]), "PAYMENT_REMINDER", `/dashboard/finance/invoices/${reg.invoiceId}`, (t) => ({
      title: t("notify.refund", { name: `${member?.firstName ?? ""} ${member?.lastName ?? ""}`, title: out.target.title }),
    }));
  }
  await notifyPromoted(out.target, out.promoted);
  return { refundNeeded: out.refundNeeded };
}

/** Staff status override: confirm (with or without payment) or move to the waitlist. */
export async function setRegistrationStatus(user: CurrentUser, kind: RegKind, registrationId: string, status: "CONFIRMED" | "WAITLIST" | "PENDING") {
  if (!can(user, "registrations.manage")) throw new AuthError("FORBIDDEN");
  const reg = await loadRegistration(kind, registrationId);
  if (reg.status === status) return;
  const member = await db.member.findUnique({ where: { id: reg.memberId }, select: { firstName: true, lastName: true } });
  const name = `${member?.firstName ?? ""} ${member?.lastName ?? ""}`;
  const out = await db.$transaction(async (tx) => {
    const target = await loadTarget(kind, reg.targetId, tx);
    let invoiceId = reg.invoiceId;
    if (status !== "WAITLIST") {
      const inv = await ensureInvoice(tx, target, reg.memberId, name, reg.invoiceId);
      invoiceId = inv?.id ?? null;
    }
    await updateReg(tx, kind, reg.id, { status, invoiceId });
    const promoted = status === "WAITLIST" && ACTIVE_STATUSES.includes(reg.status) ? await promoteWaitlist(tx, target, reg.id) : [];
    if (kind === "trip") {
      const active = await countActive(tx, target);
      if (target.status === "OPEN" && active >= target.capacity) await tx.trip.update({ where: { id: target.id }, data: { status: "FULL" } });
      if (target.status === "FULL" && active < target.capacity) await tx.trip.update({ where: { id: target.id }, data: { status: "OPEN" } });
    }
    return { target, promoted };
  });
  await audit(user.id, "set_status", kind === "event" ? "EventRegistration" : "TripRegistration", reg.id, { from: reg.status, to: status });
  await notifyLocalized(await guardianUserIds(reg.memberId), kind === "event" ? "EVENT_NEW" : "TRIP_REGISTRATION", out.target.link, (t) => ({
    title: t(`notify.statusChanged.${status}`, { name: member?.firstName ?? "", title: out.target.title }),
  }));
  await notifyPromoted(out.target, out.promoted);
}

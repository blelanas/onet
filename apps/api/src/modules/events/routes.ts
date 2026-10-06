import { Router, type Request } from "express";
import { db } from "@api/lib/db";
import { AuthError, can, canAny, requireAnyPermission, requirePermission, requireUser } from "@api/lib/auth/guards";
import { audit } from "@api/lib/audit";
import { mutation, param, qs, query, sendCsv } from "@api/lib/http";
import { slugify } from "@api/lib/utils";
import { toCsv, toDateInput } from "@onet/shared";
import { eventTabCounts, familyRegistrationsFor, getEvent, getEventForEdit, listEvents, type EventTab } from "./queries";
import { deleteEvent, saveEvent, saveEventCheckIn } from "./actions";
import { addableMembers, canSeeMoney, eventParticipants, familyEntries, hideInvoiceMoney, hidePrice, paymentState, registrationStats, rollCall } from "@api/modules/registrations/queries";
import { deadlinePassed, isOpen, loadTarget } from "@api/modules/registrations/service";

/** events module routes (mounted under /api). */
export const router = Router();

const PAGE_SIZE = 12;

/** Events list (tabs upcoming / past / drafts, category + search filters). */
export async function eventsPage(req: Request) {
  const user = await requirePermission("events.read");
  const manage = can(user, "events.manage");
  const tabParam = qs(req, "tab");
  const tab: EventTab = tabParam === "past" ? "past" : tabParam === "drafts" && manage ? "drafts" : "upcoming";
  const page = Math.max(1, Number(qs(req, "page")) || 1);
  const [{ rows, total }, counts] = await Promise.all([
    listEvents(user, { tab, category: qs(req, "category"), q: qs(req, "q"), skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    eventTabCounts(user),
  ]);
  const family = await familyRegistrationsFor(user, rows.map((r) => r.id));
  const showMoney = canSeeMoney(user);
  return { rows: rows.map((r) => hidePrice(r, showMoney)), total, page, pageSize: PAGE_SIZE, counts, family, showMoney, manage, tab };
}
router.get("/events", query(eventsPage));

/** Event detail: event + permission flags + the family registration panel entries. */
export async function eventPage(req: Request) {
  const user = await requirePermission("events.read");
  const id = param(req, "id");
  const e = await getEvent(user, id);
  const manage = can(user, "events.manage");
  const showMoney = canSeeMoney(user);
  const target = await loadTarget("event", id);
  const isKid = user.roles.includes("kid") && !can(user, "events.register");
  const entries = await familyEntries(user, target);
  return {
    event: hidePrice(e, showMoney),
    manage,
    staff: can(user, "registrations.manage") || manage,
    regManage: can(user, "registrations.manage"),
    canCheckIn: manage || can(user, "attendance.manage"),
    showMoney,
    isKid,
    open: isOpen(target),
    late: deadlinePassed(target),
    entries,
  };
}

/** Participants tab (staff). */
export async function eventParticipantsPage(req: Request) {
  const user = await requireAnyPermission("registrations.manage", "events.manage");
  const id = param(req, "id");
  const e = await getEvent(user, id);
  const regManage = can(user, "registrations.manage");
  const showMoney = canSeeMoney(user);
  const [rows, stats, addable] = await Promise.all([eventParticipants(id), registrationStats("event", id), regManage ? addableMembers("event", id) : Promise.resolve([])]);
  const collected = rows.filter((r) => r.invoice?.status === "PAID" && r.status !== "CANCELLED").reduce((s, r) => s + (r.invoice?.amount ?? 0), 0);
  return { rows: rows.map((r) => hideInvoiceMoney(r, showMoney)), stats, addable, collected: showMoney ? collected : 0, capacity: e.capacity, showMoney, canManage: regManage };
}

/** Check-in tab: active participants + saved statuses for the event day. */
export async function eventCheckInPage(req: Request) {
  const user = await requireAnyPermission("events.manage", "attendance.manage");
  const id = param(req, "id");
  const e = await getEvent(user, id);
  const [rows, saved] = await Promise.all([eventParticipants(id), rollCall(`event:${id}`, e.startAt)]);
  const active = rows.filter((r) => r.status === "CONFIRMED" || r.status === "PENDING");
  return {
    day: e.startAt,
    entries: active.map((r) => ({ memberId: r.member.id, firstName: r.member.firstName, lastName: r.member.lastName, photoUrl: r.member.photoUrl, status: saved[r.member.id], pending: r.status === "PENDING" })),
  };
}

/** Event edit form data. */
export async function eventFormPage(req: Request) {
  await requirePermission("events.manage");
  return getEventForEdit(param(req, "id"));
}

router.get(
  "/events/:id/participants/export.csv",
  query(async (req, res) => {
    const user = await requireUser();
    if (!canAny(user, "registrations.manage", "events.manage")) throw new AuthError("FORBIDDEN");
    const id = param(req, "id");
    const event = await db.event.findUnique({ where: { id }, select: { title: true, startAt: true } });
    if (!event) throw new AuthError("NOT_FOUND");
    const rows = await eventParticipants(id);
    await audit(user.id, "export", "EventRegistration", id, { count: rows.length });
    sendCsv(
      res,
      `participants-${slugify(event.title)}-${toDateInput(event.startAt)}.csv`,
      toCsv([
        ["membershipNumber", "firstName", "lastName", "dateOfBirth", "group", "status", "payment", "invoiceNumber", "amountTND", "guardian", "guardianPhone", "registeredBy", "registeredAt", "notes"],
        ...rows.map((r) => [
          r.member.membershipNumber,
          r.member.firstName,
          r.member.lastName,
          toDateInput(r.member.dateOfBirth),
          r.member.group?.name,
          r.status,
          paymentState(r.invoice),
          r.invoice?.number,
          r.invoice ? r.invoice.amount / 1000 : 0,
          r.member.parentLinks[0] ? `${r.member.parentLinks[0].parent.firstName} ${r.member.parentLinks[0].parent.lastName}` : "",
          r.member.parentLinks[0]?.parent.phone,
          r.registeredBy?.name,
          toDateInput(r.createdAt),
          r.notes,
        ]),
      ]),
    );
  }),
);
router.get("/events/:id/participants", query(eventParticipantsPage));
router.get("/events/:id/checkin", query(eventCheckInPage));
router.get("/events/:id/form", query(eventFormPage));
router.get("/events/:id", query(eventPage));

router.post(
  "/events",
  mutation((req) => saveEvent(req.body)),
);
router.delete(
  "/events/:id",
  mutation((req) => deleteEvent(param(req, "id"))),
);
router.post(
  "/events/:id/checkin",
  mutation((req) => saveEventCheckIn({ ...req.body, id: param(req, "id") })),
);

import { Router, type Request } from "express";
import { db } from "@api/lib/db";
import { AuthError, can, canAny, requirePermission, requireUser } from "@api/lib/auth/guards";
import { audit } from "@api/lib/audit";
import { mutation, param, qs, query, sendCsv } from "@api/lib/http";
import { slugify } from "@api/lib/utils";
import { toCsv, toDateInput } from "@onet/shared";
import { familyTripRegistrations, getTrip, getTripForEdit, isTripMonitor, listTrips, monitorOptions, parseLines, parseProgram, tripDocumentCount, tripTabCounts, type TripTab } from "./queries";
import { addTripMonitor, deleteTrip, removeTripMonitor, saveTrip, saveTripRollCall } from "./actions";
import { addableMembers, canSeeMoney, familyEntries, hideInvoiceMoney, hidePrice, paymentState, registrationStats, rollCall, tripParticipants } from "@api/modules/registrations/queries";
import { deadlinePassed, isOpen, loadTarget } from "@api/modules/registrations/service";

/** trips module routes (mounted under /api). */
export const router = Router();

const PAGE_SIZE = 12;

/** Trips list (tabs upcoming / supervised / past / drafts). */
export async function tripsPage(req: Request) {
  const user = await requirePermission("trips.read");
  const manage = can(user, "trips.manage");
  const counts = await tripTabCounts(user);
  const requested = qs(req, "tab");
  const tab: TripTab = requested === "past" ? "past" : requested === "drafts" && manage ? "drafts" : requested === "supervised" && counts.supervised ? "supervised" : "upcoming";
  const page = Math.max(1, Number(qs(req, "page")) || 1);
  const { rows, total } = await listTrips(user, { tab, category: qs(req, "category"), q: qs(req, "q"), skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE });
  const family = await familyTripRegistrations(user, rows.map((r) => r.id));
  const showMoney = canSeeMoney(user);
  return { rows: rows.map((r) => hidePrice(r, showMoney)), total, page, pageSize: PAGE_SIZE, counts, family, showMoney, manage, tab };
}
router.get("/trips", query(tripsPage));

/** Monitor options for the new-trip form. */
export async function tripFormOptionsPage() {
  await requirePermission("trips.manage");
  return { monitors: await monitorOptions() };
}
router.get("/trips/options", query(tripFormOptionsPage));

async function loadTripForStaff(req: Request) {
  const user = await requirePermission("trips.read");
  const id = param(req, "id");
  const trip = await getTrip(user, id);
  return { user, id, trip, monitor: isTripMonitor(user, trip) };
}

/** Trip detail: trip + flags + parent stepper entries + program / documents / monitors. */
export async function tripPage(req: Request) {
  const { user, id, trip, monitor } = await loadTripForStaff(req);
  const manage = can(user, "trips.manage");
  const regManage = can(user, "registrations.manage");
  const staff = regManage || manage || monitor;
  const showMoney = canSeeMoney(user);
  const target = await loadTarget("trip", id);
  const entries = await familyEntries(user, target);
  const familyConfirmed = entries.some((e) => e.registration?.status === "CONFIRMED");
  const showPhones = staff || familyConfirmed;
  const showShared = can(user, "documents.manage") || (await tripDocumentCount(id)) > 0;
  const monitorChoices = manage ? (await monitorOptions()).filter((o) => !trip.monitors.some((m) => m.memberId === o.id)) : [];
  return {
    // Monitor phone numbers are only shared with staff and families with a confirmed child.
    trip: hidePrice({ ...trip, monitors: trip.monitors.map((m) => ({ ...m, member: { ...m.member, phone: showPhones ? m.member.phone : null } })) }, showMoney),
    manage,
    regManage,
    monitor,
    staff,
    canRollCall: manage || (monitor && can(user, "attendance.manage")),
    showMoney,
    isKid: user.roles.includes("kid") && !can(user, "trips.register"),
    open: isOpen(target),
    late: deadlinePassed(target),
    entries,
    steps: parseProgram(trip.program),
    docs: parseLines(trip.requiredDocuments),
    showShared,
    monitorChoices,
  };
}

/** Participants tab: staff and the trip's monitors. */
export async function tripParticipantsPage(req: Request) {
  const { user, id, trip, monitor } = await loadTripForStaff(req);
  const regManage = can(user, "registrations.manage");
  if (!regManage && !can(user, "trips.manage") && !monitor) throw new AuthError("FORBIDDEN");
  const showMoney = canSeeMoney(user);
  const [rows, stats, addable] = await Promise.all([tripParticipants(id), registrationStats("trip", id), regManage ? addableMembers("trip", id) : Promise.resolve([])]);
  const active = rows.filter((r) => r.status === "CONFIRMED" || r.status === "PENDING");
  const expected = active.reduce((s, r) => s + (r.invoice && r.invoice.status !== "CANCELLED" ? r.invoice.amount : 0), 0);
  const collected = active.reduce((s, r) => s + (r.invoice?.status === "PAID" ? r.invoice.amount : 0), 0);
  return {
    rows: rows.map((r) => hideInvoiceMoney(r, showMoney)),
    stats,
    addable,
    capacity: trip.capacity,
    consent: active.filter((r) => r.parentConsent).length,
    docsOk: active.filter((r) => r.documentsStatus === "COMPLETE").length,
    activeCount: active.length,
    expected: showMoney ? expected : 0,
    collected: showMoney ? collected : 0,
    showMoney,
    regManage,
  };
}

/** Departure roll-call tab. */
export async function tripRollCallPage(req: Request) {
  const { user, id, trip, monitor } = await loadTripForStaff(req);
  if (!can(user, "trips.manage") && !(monitor && can(user, "attendance.manage"))) throw new AuthError("FORBIDDEN");
  const [rows, saved] = await Promise.all([tripParticipants(id), rollCall(`trip:${id}`, trip.departAt)]);
  const active = rows.filter((r) => r.status === "CONFIRMED" || r.status === "PENDING");
  return {
    departAt: trip.departAt,
    entries: active.map((r) => ({
      memberId: r.member.id,
      firstName: r.member.firstName,
      lastName: r.member.lastName,
      photoUrl: r.member.photoUrl,
      status: saved[r.member.id],
      parentConsent: r.parentConsent,
      documentsStatus: r.documentsStatus,
      medicalNotes: r.member.medicalNotes,
    })),
  };
}

/** Trip edit form data. */
export async function tripFormPage(req: Request) {
  await requirePermission("trips.manage");
  const [trip, monitors] = await Promise.all([getTripForEdit(param(req, "id")), monitorOptions()]);
  return { trip: { ...trip, monitorIds: trip.monitors.map((m) => m.memberId) }, monitors };
}

router.get(
  "/trips/:id/participants/export.csv",
  query(async (req, res) => {
    const user = await requireUser();
    const id = param(req, "id");
    const trip = await db.trip.findUnique({ where: { id }, select: { title: true, departAt: true, monitors: { select: { memberId: true } } } });
    if (!trip) throw new AuthError("NOT_FOUND");
    const supervises = !!user.memberId && trip.monitors.some((m) => m.memberId === user.memberId);
    if (!canAny(user, "registrations.manage", "trips.manage") && !supervises) throw new AuthError("FORBIDDEN");
    const rows = await tripParticipants(id);
    await audit(user.id, "export", "TripRegistration", id, { count: rows.length });
    sendCsv(
      res,
      `participants-${slugify(trip.title)}-${toDateInput(trip.departAt)}.csv`,
      toCsv([
        ["membershipNumber", "firstName", "lastName", "dateOfBirth", "group", "status", "parentConsent", "documents", "payment", "invoiceNumber", "amountTND", "guardian", "guardianPhone", "medicalNotes", "registeredBy", "registeredAt", "notes"],
        ...rows.map((r) => [
          r.member.membershipNumber,
          r.member.firstName,
          r.member.lastName,
          toDateInput(r.member.dateOfBirth),
          r.member.group?.name,
          r.status,
          r.parentConsent ? "yes" : "no",
          r.documentsStatus,
          paymentState(r.invoice),
          r.invoice?.number,
          r.invoice ? r.invoice.amount / 1000 : 0,
          r.member.parentLinks[0] ? `${r.member.parentLinks[0].parent.firstName} ${r.member.parentLinks[0].parent.lastName}` : "",
          r.member.parentLinks[0]?.parent.phone,
          r.member.medicalNotes,
          r.registeredBy?.name,
          toDateInput(r.createdAt),
          r.notes,
        ]),
      ]),
    );
  }),
);
router.get("/trips/:id/participants", query(tripParticipantsPage));
router.get("/trips/:id/rollcall", query(tripRollCallPage));
router.get("/trips/:id/form", query(tripFormPage));
router.get("/trips/:id", query(tripPage));

router.post(
  "/trips",
  mutation((req) => saveTrip(req.body)),
);
router.delete(
  "/trips/:id",
  mutation((req) => deleteTrip(param(req, "id"))),
);
router.post(
  "/trips/:id/monitors",
  mutation((req) => addTripMonitor({ ...req.body, tripId: param(req, "id") })),
);
router.delete(
  "/trips/:id/monitors/:memberId",
  mutation((req) => removeTripMonitor(param(req, "id"), param(req, "memberId"))),
);
router.post(
  "/trips/:id/rollcall",
  mutation((req) => saveTripRollCall({ ...req.body, id: param(req, "id") })),
);

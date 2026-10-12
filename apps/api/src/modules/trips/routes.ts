import { Router, type Request } from "express";
import { db } from "@api/lib/db";
import { AuthError, can, canAny, requirePermission, requireUser } from "@api/lib/auth/guards";
import { audit } from "@api/lib/audit";
import { mutation, param, qs, query, sendCsv } from "@api/lib/http";
import { slugify } from "@api/lib/utils";
import { toCsv, toDateInput } from "@onet/shared";
import { familyTripRegistrations, getTrip, getTripForEdit, isTripMonitor, listTrips, monitorOptions, parseLines, parseProgram, tripDocumentCount, tripTabCounts, type TripTab } from "./queries";
import { addTripMonitor, deleteTrip, removeTripMonitor, saveTrip, saveTripRollCall } from "./actions";
import { canManageTrip, requireTripManager } from "./access";
import { participantCandidates, tripParticipantRows, tripTotals } from "./participants";
import { addTripParticipant, finalizeTripList, recordTripPayment, removeTripParticipant, reopenTripList } from "./participant-actions";
import { requireReportAccess, tripReport, tripReportCsv } from "./report";
import { orgProfile } from "@api/modules/finance/queries";
import { canSeeMoney, familyEntries, hidePrice, paymentState, registrationStats, rollCall, tripParticipants } from "@api/modules/registrations/queries";
import { ACTIVE_STATUSES, deadlinePassed, isOpen, loadTarget } from "@api/modules/registrations/service";

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

/**
 * Trip detail: trip + flags + parent stepper entries + program / documents / managers.
 * `isManager`: the user is one of the trip's managers (TripMonitor); `canManage`: manager or admin
 * (trips.manage) — they build the participant list, record payments and finalize it.
 */
export async function tripPage(req: Request) {
  const { user, id, trip, monitor } = await loadTripForStaff(req);
  const manage = can(user, "trips.manage");
  const regManage = can(user, "registrations.manage");
  const canManage = manage || monitor;
  const staff = regManage || canManage;
  const showMoney = canSeeMoney(user) || canManage;
  const target = await loadTarget("trip", id);
  // The family stepper (consent + register + pay) is for parents only.
  const entries = user.roles.includes("parent") ? await familyEntries(user, target) : [];
  const closedBy = trip.listClosedById ? await db.user.findUnique({ where: { id: trip.listClosedById }, select: { name: true } }) : null;
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
    isManager: monitor,
    canManage,
    staff,
    listClosedAt: trip.listClosedAt,
    listClosedBy: closedBy?.name ?? null,
    /** Trip managers (= the trip's TripMonitor members). */
    managers: trip.monitors.map((m) => ({ memberId: m.memberId, firstName: m.member.firstName, lastName: m.member.lastName, photoUrl: m.member.photoUrl, phone: showPhones ? m.member.phone : null })),
    canReport: canManage || can(user, "finance.read"),
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

/**
 * Participants tab (trip managers and staff): every registration with age, phone (own or guardian's),
 * type, amount due / paid / remaining and payment methods, plus totals and the list state.
 */
export async function tripParticipantsPage(req: Request) {
  const { user, id, trip, monitor } = await loadTripForStaff(req);
  const regManage = can(user, "registrations.manage");
  const admin = can(user, "trips.manage");
  const canManage = admin || monitor;
  if (!regManage && !canManage) throw new AuthError("FORBIDDEN");
  const [rows, stats] = await Promise.all([tripParticipantRows(id), registrationStats("trip", id)]);
  const totals = tripTotals(rows);
  const active = rows.filter((r) => ACTIVE_STATUSES.includes(r.status));
  const closedBy = trip.listClosedById ? await db.user.findUnique({ where: { id: trip.listClosedById }, select: { name: true } }) : null;
  return {
    rows,
    stats,
    totals,
    capacity: trip.capacity,
    price: trip.price,
    consent: active.filter((r) => r.parentConsent).length,
    docsOk: active.filter((r) => r.documentsStatus === "COMPLETE").length,
    activeCount: active.length,
    /** Unpaid balances still open on the active list (warned about before finalizing). */
    unpaidCount: active.filter((r) => r.remaining > 0).length,
    closed: trip.listClosedAt ? { at: trip.listClosedAt, by: closedBy?.name ?? null } : null,
    canManage,
    canReopen: admin,
    regManage,
  };
}

/** Kids / members a manager can add (search). */
export async function tripCandidatesPage(req: Request) {
  const user = await requireUser();
  const id = param(req, "id");
  await requireTripManager(user, id);
  return { rows: await participantCandidates(id, qs(req, "q")) };
}

/** Report for the accountants: managers (and admins) of the trip, or finance.read. */
export async function tripReportPage(req: Request) {
  const user = await requireUser();
  const id = param(req, "id");
  await requireReportAccess(user, id);
  const [report, org, canManage] = await Promise.all([tripReport(id), orgProfile(), canManageTrip(user, id)]);
  return { ...report, org, canManage, canReopen: can(user, "trips.manage") };
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
router.get("/trips/:id/candidates", query(tripCandidatesPage));
router.get(
  "/trips/:id/report.csv",
  query(async (req, res) => {
    const user = await requireUser();
    const id = param(req, "id");
    await requireReportAccess(user, id);
    const report = await tripReport(id);
    await audit(user.id, "export", "TripReport", id, { count: report.participants.length });
    const { filename, csv } = await tripReportCsv(report);
    sendCsv(res, filename, csv);
  }),
);
router.get("/trips/:id/report", query(tripReportPage));
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

// ─── Trip managers: participant list, payments, finalization ─────────────────
router.post(
  "/trips/:id/participants",
  mutation((req) => addTripParticipant({ ...req.body, tripId: param(req, "id") })),
);
router.delete(
  "/trips/:id/participants/:registrationId",
  mutation((req) => removeTripParticipant(param(req, "id"), param(req, "registrationId"))),
);
router.post(
  "/trips/:id/participants/:registrationId/payments",
  mutation((req) => recordTripPayment({ ...req.body, tripId: param(req, "id"), registrationId: param(req, "registrationId") })),
);
router.post(
  "/trips/:id/finalize",
  mutation((req) => finalizeTripList(param(req, "id"))),
);
router.post(
  "/trips/:id/reopen",
  mutation((req) => reopenTripList(param(req, "id"))),
);

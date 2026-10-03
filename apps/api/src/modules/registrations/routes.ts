import { Router, type Request } from "express";
import { AuthError, can, requireUser } from "@api/lib/auth/guards";
import { mutation, param, qs, query } from "@api/lib/http";
import { listRegistrations, paymentState, targetOptions } from "./queries";
import { addParticipant, bulkRegistrations, cancelRegistrationAction, registerMembers, setRegistrationStatusAction, updateTripRegistration } from "./actions";
import type { RegKind } from "./service";

/** registrations module routes (mounted under /api). */
export const router = Router();

const PAGE_SIZE = 20;

/**
 * Registrations console (staff: every registration, KPIs, filters, paginated) or
 * "my registrations" (families: their children's and their own registrations).
 */
export async function registrationsPage(req: Request) {
  const user = await requireUser();
  const staff = can(user, "registrations.manage");
  if (!staff && !can(user, "events.register") && !can(user, "trips.register")) throw new AuthError("FORBIDDEN");
  const scope = qs(req, "scope") === "past" ? "past" : qs(req, "scope") === "all" ? "all" : "upcoming";
  const filters = { kind: qs(req, "kind"), status: qs(req, "status"), target: qs(req, "target"), payment: qs(req, "payment"), q: qs(req, "q"), scope };
  const rows = await listRegistrations(user, filters);
  if (!staff) {
    return { staff: false as const, scope, rows, canPay: can(user, "invoices.pay") || can(user, "finance.read"), page: 1, pageSize: rows.length, total: rows.length, kpi: null, targets: null };
  }
  const page = Math.max(1, Number(qs(req, "page")) || 1);
  const live = rows.filter((r) => r.status !== "CANCELLED");
  const unpaid = live.filter((r) => paymentState(r.invoice) === "UNPAID");
  return {
    staff: true as const,
    scope,
    rows: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    canPay: true,
    page,
    pageSize: PAGE_SIZE,
    total: rows.length,
    kpi: {
      active: live.length,
      pending: live.filter((r) => r.status === "PENDING").length,
      waitlist: live.filter((r) => r.status === "WAITLIST").length,
      unpaid: unpaid.length,
      unpaidAmount: unpaid.reduce((s, r) => s + (r.invoice?.amount ?? 0), 0),
    },
    targets: await targetOptions(),
  };
}
router.get("/registrations", query(registrationsPage));

const kind = (req: Request) => param(req, "kind") as RegKind;

router.post(
  "/registrations",
  mutation((req) => registerMembers(req.body)),
);
router.post(
  "/registrations/participants",
  mutation((req) => addParticipant(req.body)),
);
router.post(
  "/registrations/bulk",
  mutation((req) => bulkRegistrations(req.body)),
);
router.post(
  "/registrations/:kind/:id/cancel",
  mutation((req) => cancelRegistrationAction(kind(req), param(req, "id"))),
);
router.post(
  "/registrations/:kind/:id/status",
  mutation((req) => setRegistrationStatusAction(kind(req), param(req, "id"), req.body?.status)),
);
router.patch(
  "/registrations/trip/:id",
  mutation((req) => updateTripRegistration(param(req, "id"), { parentConsent: req.body?.parentConsent, documentsStatus: req.body?.documentsStatus })),
);

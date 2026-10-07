import { Router, type Request } from "express";
import { rateLimit } from "express-rate-limit";
import { db } from "@api/lib/db";
import { requirePermission } from "@api/lib/auth/guards";
import { hashToken } from "@api/lib/auth/session";
import { mutation, param, qs, query, sendData } from "@api/lib/http";
import { approveUsers, createInvitation, deletePreapproved, importPreapproved, rejectUsers, revokeInvitation, signup } from "./actions";
import { approvalCounts, listInvitations, listPendingUsers, listPreapproved } from "./queries";
import { invitationState, isSignupRole } from "./lib";

/** Self sign-up (public) and the Approvals page (users.approve) — mounted under /api. */
export const router = Router();

const limited = (limit: number, windowMs: number) =>
  rateLimit({ windowMs, limit, standardHeaders: "draft-8", legacyHeaders: false, handler: (_req, res) => sendData(res, { ok: false, error: "errors.tooManyAttempts" }, 429) });

// ─── Public ─────────────────────────────────────────────────────────────────

/** Invitation preview for the sign-up page. Never reveals who created it or who used it. */
export async function invitationPreview(req: Request) {
  const token = param(req, "token");
  const inv = token.length <= 200 ? await db.invitation.findUnique({ where: { tokenHash: hashToken(token) } }) : null;
  if (!inv || !isSignupRole(inv.role)) return { valid: false as const, reason: "invalid" as const };
  const state = invitationState(inv);
  if (state !== "valid") return { valid: false as const, reason: state };
  return { valid: true as const, role: inv.role, label: inv.label, expiresAt: inv.expiresAt };
}
router.get("/auth/invitations/:token", limited(60, 5 * 60_000), query(invitationPreview));

// Per-IP, like /auth/login: account creation is cheap to abuse.
router.post("/auth/signup", limited(10, 15 * 60_000), mutation((req) => signup(req.body)));

// ─── Approvals (users.approve) ──────────────────────────────────────────────

function pageOf(req: Request, size: number) {
  const n = Math.floor(Number(qs(req, "page")));
  const page = Number.isFinite(n) && n >= 1 ? n : 1;
  return { page, pageSize: size, skip: (page - 1) * size, take: size };
}

/** Pending sign-ups awaiting approval. */
export async function approvalsPendingPage(req: Request) {
  await requirePermission("users.approve");
  const { page, pageSize, skip, take } = pageOf(req, 50);
  const [data, counts] = await Promise.all([listPendingUsers(skip, take), approvalCounts()]);
  return { ...data, counts, page, pageSize };
}
router.get("/approvals/pending", query(approvalsPendingPage));

export async function approvalsInvitationsPage(req: Request) {
  await requirePermission("users.approve");
  const { page, pageSize, skip, take } = pageOf(req, 25);
  const [data, counts] = await Promise.all([listInvitations(skip, take), approvalCounts()]);
  return { ...data, counts, page, pageSize };
}
router.get("/approvals/invitations", query(approvalsInvitationsPage));

export async function approvalsPreapprovedPage(req: Request) {
  await requirePermission("users.approve");
  const { page, pageSize, skip, take } = pageOf(req, 50);
  const f = qs(req, "filter");
  const filter = f === "waiting" || f === "used" ? f : "all";
  const [data, counts] = await Promise.all([listPreapproved(filter, skip, take), approvalCounts()]);
  return { ...data, counts, filter, page, pageSize };
}
router.get("/approvals/preapproved", query(approvalsPreapprovedPage));

router.post("/approvals/approve", mutation((req) => approveUsers(req.body)));
router.post("/approvals/reject", mutation((req) => rejectUsers(req.body)));
router.post("/approvals/invitations", mutation((req) => createInvitation(req.body)));
router.post("/approvals/invitations/:id/revoke", mutation((req) => revokeInvitation(param(req, "id"))));
router.post("/approvals/preapproved/import", mutation((req) => importPreapproved(req.body)));
router.delete("/approvals/preapproved/:id", mutation((req) => deletePreapproved(param(req, "id"))));

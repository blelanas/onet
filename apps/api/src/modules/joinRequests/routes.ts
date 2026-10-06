import { Router, type Request } from "express";
import { requirePermission } from "@api/lib/auth/guards";
import { mutation, param, qs, query } from "@api/lib/http";
import { listJoinRequests } from "./queries";
import { approveJoinRequest, rejectJoinRequest } from "./actions";

/** joinRequests module routes (mounted under /api). */
export const router = Router();

const PAGE_SIZE = 12;

/** Join requests sent from the public site (pending / processed tabs). */
export async function joinRequestsPage(req: Request) {
  await requirePermission("members.manage");
  const tab = qs(req, "tab") === "processed" ? "processed" : "pending";
  const page = Math.max(1, Number(qs(req, "page")) || 1);
  const data = await listJoinRequests(tab, (page - 1) * PAGE_SIZE, PAGE_SIZE);
  return { ...data, tab, page, pageSize: PAGE_SIZE };
}
router.get("/join-requests", query(joinRequestsPage));

router.post(
  "/join-requests/:id/approve",
  mutation((req) => approveJoinRequest({ ...(req.body ?? {}), id: param(req, "id") })),
);
router.post(
  "/join-requests/:id/reject",
  mutation((req) => rejectJoinRequest(param(req, "id"))),
);

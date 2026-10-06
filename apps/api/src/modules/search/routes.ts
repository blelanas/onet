import { Router, type Request } from "express";
import { requireUser } from "@api/lib/auth/guards";
import { qs, query } from "@api/lib/http";
import { allowedSections, globalSearch, SEARCH_SECTIONS } from "./queries";

/** search module routes (mounted under /api). */
export const router = Router();

/** Global search across every section the user may read (scoped like each module). */
export async function searchPage(req: Request) {
  const user = await requireUser();
  const q = (qs(req, "q") ?? "").trim().slice(0, 80);
  const allowed = allowedSections(user);
  const only = SEARCH_SECTIONS.find((s) => s === qs(req, "type") && allowed.includes(s));
  const ready = q.length >= 2;
  const results = ready ? await globalSearch(user, q, { only, take: only ? 30 : 5 }) : [];
  // Section counts for the chips: when filtered, count every section without fetching hits.
  const counts = ready && only ? await globalSearch(user, q, { take: 0 }) : results;
  const allCounts = counts.map((r) => ({ section: r.section, count: r.count }));
  return { q, ready, only: only ?? null, allowed, results, allCounts };
}
router.get("/search", query(searchPage));

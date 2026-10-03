import { Router, type Request } from "express";
import { db } from "@api/lib/db";
import { AuthError, requirePermission, requireUser } from "@api/lib/auth/guards";
import { mutation, param, qs, query } from "@api/lib/http";
import { canAccessEntityDocs } from "./access";
import { addDocument, deleteDocument } from "./actions";
import { listDocuments } from "./queries";

/** documents module routes (mounted under /api). */
export const router = Router();

/** Documents attached to one entity (member, trip, event, invoice, activity). */
router.get(
  "/documents/entity",
  query(async (req) => {
    const user = await requireUser();
    const entityType = qs(req, "type") ?? "";
    const entityId = qs(req, "id") ?? "";
    if (!(await canAccessEntityDocs(user, entityType, entityId, "read"))) throw new AuthError("FORBIDDEN");
    const [docs, canWrite] = await Promise.all([
      db.document.findMany({ where: { entityType, entityId }, orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { name: true } } } }),
      canAccessEntityDocs(user, entityType, entityId, "write"),
    ]);
    return { docs, canWrite, canManage: user.permissions.has("documents.manage"), userId: user.id };
  }),
);

/** Document library (scoped like canAccessEntityDocs): filters ?q, ?type (entity type), ?category, ?page. */
export async function documentsLibraryPage(req: Request) {
  const user = await requirePermission("documents.read");
  const pageSize = 18;
  const page = Math.max(1, Number(qs(req, "page")) || 1);
  const filters = { q: qs(req, "q"), entityType: qs(req, "type"), category: qs(req, "category") };
  const { rows, total, countsByType } = await listDocuments(user, { ...filters, skip: (page - 1) * pageSize, take: pageSize });
  return {
    rows,
    total,
    countsByType,
    page,
    pageSize,
    filtered: !!(filters.q || filters.entityType || filters.category),
    canManage: user.permissions.has("documents.manage"),
    userId: user.id,
  };
}
router.get("/documents", query(documentsLibraryPage));

router.post("/documents", mutation((req) => addDocument(req.body)));
router.delete("/documents/:id", mutation((req) => deleteDocument(param(req, "id"))));

import { Router } from "express";
import { db } from "@api/lib/db";
import { AuthError, requireUser } from "@api/lib/auth/guards";
import { mutation, param, qs, query } from "@api/lib/http";
import { canAccessEntityDocs } from "./access";
import { addDocument, deleteDocument } from "./actions";

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

router.post("/documents", mutation((req) => addDocument(req.body)));
router.delete("/documents/:id", mutation((req) => deleteDocument(param(req, "id"))));

import { revalidatePath } from "@api/lib/cache";
import { z } from "zod";
import { db } from "@api/lib/db";
import { getCurrentUser } from "@api/lib/auth/session";
import { AuthError } from "@api/lib/auth/guards";
import { formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { DOCUMENT_CATEGORIES, DOCUMENT_ENTITY_TYPES } from "@api/lib/constants";
import { canAccessEntityDocs } from "./access";

const docSchema = z.object({
  name: zs.reqStr(200),
  url: z.string().startsWith("/api/files/", "errors.validation"),
  mimeType: zs.reqStr(120),
  sizeBytes: zs.int(0),
  category: z.enum(DOCUMENT_CATEGORIES).default("OTHER"),
  entityType: z.enum(DOCUMENT_ENTITY_TYPES).default("GENERAL"),
  entityId: zs.optId,
  revalidate: zs.optStr,
});

export async function addDocument(fd: FormData | Record<string, unknown>) {
  return runAction(docSchema, formToObject(fd), async (d) => {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED");
    if (!(await canAccessEntityDocs(user, d.entityType, d.entityId ?? null, "write"))) throw new AuthError("FORBIDDEN");
    const doc = await db.document.create({
      data: { name: d.name, url: d.url, mimeType: d.mimeType, sizeBytes: d.sizeBytes, category: d.category, entityType: d.entityType, entityId: d.entityId ?? null, uploadedById: user.id },
    });
    await audit(user.id, "upload", "Document", doc.id, { entityType: d.entityType, entityId: d.entityId });
    if (d.revalidate?.startsWith("/dashboard")) revalidatePath(d.revalidate);
    return { id: doc.id };
  });
}

export async function deleteDocument(id: string) {
  return runAction(zs.id, id, async (docId) => {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED");
    const doc = await db.document.findUnique({ where: { id: docId } });
    if (!doc) throw new AuthError("NOT_FOUND");
    // Uploaders may delete their own documents only while they still have write access to
    // the entity (e.g. a former guardian loses it with the guardianship).
    const own = doc.uploadedById === user.id && (await canAccessEntityDocs(user, doc.entityType, doc.entityId, "write"));
    if (!user.permissions.has("documents.manage") && !own) throw new AuthError("FORBIDDEN");
    await db.document.delete({ where: { id: docId } });
    // Also erase the stored binary (personal data such as medical forms must not linger).
    const fileId = doc.url.startsWith("/api/files/") ? doc.url.slice("/api/files/".length) : null;
    if (fileId && (await db.document.count({ where: { url: doc.url } })) === 0) await db.storedFile.deleteMany({ where: { id: fileId } });
    await audit(user.id, "delete", "Document", docId, { name: doc.name });
    revalidatePath("/dashboard", "layout");
  });
}

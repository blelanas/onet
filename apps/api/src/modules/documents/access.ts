import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { visibleMemberIds } from "@api/lib/auth/scope";

/**
 * Can `user` see / attach documents for this entity?
 *  - documents.manage → everything
 *  - MEMBER → member must be in the user's visible set (self, own children, own groups)
 *  - INVOICE → finance staff, or the payer / guardians of the child
 *  - EVENT / TRIP / ACTIVITY / GENERAL → any user with documents.read (shared material)
 */
export async function canAccessEntityDocs(user: CurrentUser, entityType: string, entityId: string | null, mode: "read" | "write") {
  if (user.permissions.has("documents.manage")) return true;
  if (mode === "read" && !user.permissions.has("documents.read")) return false;
  if (entityType === "MEMBER" && entityId) {
    const ids = await visibleMemberIds(user);
    if (ids !== "all" && !ids.includes(entityId)) return false;
    // Writing: only guardians (e.g. upload a signed authorization) or the member themself (not kids).
    if (mode === "write") {
      if (user.roles.includes("kid") && user.roles.length === 1) return false;
      if (entityId === user.memberId) return true;
      return !!user.memberId && (await db.guardianship.count({ where: { parentId: user.memberId, childId: entityId } })) > 0;
    }
    return true;
  }
  if (entityType === "INVOICE" && entityId) {
    // Reading invoices needs finance.read; attaching files to them needs finance.manage.
    if (user.permissions.has(mode === "write" ? "finance.manage" : "finance.read")) return true;
    const inv = await db.invoice.findUnique({ where: { id: entityId }, select: { payerId: true } });
    return mode === "read" && !!inv && inv.payerId === user.memberId;
  }
  return mode === "read";
}

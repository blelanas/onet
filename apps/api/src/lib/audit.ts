import { db } from "@api/lib/db";
import { clientIp } from "@api/lib/context";

/** Record a sensitive operation. Never throws: auditing must not break the main flow. */
export async function audit(userId: string | null, action: string, entity: string, entityId?: string | null, details?: Record<string, unknown>) {
  try {
    await db.auditLog.create({
      data: { userId, action, entity, entityId: entityId ?? null, details: details ? JSON.stringify(details) : null, ip: clientIp() },
    });
  } catch (e) {
    console.error("[audit] failed", e);
  }
}

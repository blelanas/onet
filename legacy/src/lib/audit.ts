import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";

/** Record a sensitive operation. Never throws: auditing must not break the main flow. */
export async function audit(
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  details?: Record<string, unknown>,
) {
  try {
    const h = await headers();
    await db.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: entityId ?? null,
        details: details ? JSON.stringify(details) : null,
        ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      },
    });
  } catch (e) {
    console.error("[audit] failed", e);
  }
}

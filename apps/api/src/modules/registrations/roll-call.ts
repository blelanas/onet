import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { ATTENDANCE_STATUSES } from "@api/lib/constants";
import { startOfDay } from "@api/lib/dates";
import { audit } from "@api/lib/audit";
import { ACTIVE_STATUSES, type RegKind } from "./service";

/**
 * Saves a check-in / roll-call. Form fields are `s_<memberId>` = PRESENT | ABSENT | LATE | EXCUSED.
 * Only members with an active registration are accepted; one Attendance row per member/day/context.
 */
export async function saveRollCall(user: CurrentUser, kind: RegKind, targetId: string, day: Date, form: Record<string, unknown>) {
  const regs =
    kind === "event"
      ? await db.eventRegistration.findMany({ where: { eventId: targetId, status: { in: ACTIVE_STATUSES } }, select: { memberId: true } })
      : await db.tripRegistration.findMany({ where: { tripId: targetId, status: { in: ACTIVE_STATUSES } }, select: { memberId: true } });
  const allowed = new Set(regs.map((r) => r.memberId));
  const date = startOfDay(day);
  const contextKey = `${kind}:${targetId}`;
  const entries = Object.entries(form)
    .filter(([k, v]) => k.startsWith("s_") && allowed.has(k.slice(2)) && (ATTENDANCE_STATUSES as readonly string[]).includes(String(v)))
    .map(([k, v]) => ({ memberId: k.slice(2), status: String(v) }));
  await db.$transaction(
    entries.map((e) =>
      db.attendance.upsert({
        where: { memberId_date_contextKey: { memberId: e.memberId, date, contextKey } },
        create: { memberId: e.memberId, date, contextKey, status: e.status, recordedById: user.id, eventId: kind === "event" ? targetId : null, tripId: kind === "trip" ? targetId : null },
        update: { status: e.status, recordedById: user.id },
      }),
    ),
  );
  await audit(user.id, "roll_call", kind === "event" ? "Event" : "Trip", targetId, { count: entries.length });
  return entries.length;
}

import { revalidatePath } from "@api/lib/cache";
import { z } from "zod";
import { db } from "@api/lib/db";
import { requirePermission } from "@api/lib/auth/guards";
import { ActionError, runAction } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { getTranslations } from "@api/lib/i18n";
import { ATTENDANCE_STATUSES } from "@api/lib/constants";
import { formatDate } from "@api/lib/dates";
import { notifyGuardians } from "@api/lib/services/notifications";
import { normalizeDay, parseContextKey, parseDayParam } from "./day";
import { assertContextAllowed, rosterFor } from "./queries";

const schema = z.object({
  contextKey: z.string().refine((v) => !!parseContextKey(v), "errors.validation"),
  date: z.string().refine((v) => !!parseDayParam(v), "errors.validation"),
  entries: z
    .array(z.object({ memberId: z.string().min(1), status: z.enum(ATTENDANCE_STATUSES), note: z.string().trim().max(300).optional() }))
    .min(1, "errors.required")
    .max(300),
});

/**
 * Upserts one Attendance row per (member, day, context). Guardians are notified when a child
 * becomes ABSENT (only on the transition, so re-saving does not spam them).
 */
export async function saveAttendance(input: z.input<typeof schema>) {
  return runAction(schema, input, async (d) => {
    const user = await requirePermission("attendance.manage");
    const ctx = parseContextKey(d.contextKey)!;
    await assertContextAllowed(user, ctx);
    const date = normalizeDay(d.date);
    if (date.getTime() > normalizeDay().getTime() + 86400_000) throw new ActionError("errors.validation");

    // Only members of the roster (or already recorded that day) can be marked.
    const roster = await rosterFor(ctx, date);
    const allowed = new Set(roster.members.map((m) => m.id));
    if (d.entries.some((e) => !allowed.has(e.memberId))) throw new ActionError("errors.forbidden");

    const before = roster.statuses;
    const link = ctx.kind === "group" ? { groupId: ctx.id } : { activityId: ctx.id };
    await db.$transaction(
      d.entries.map((e) =>
        db.attendance.upsert({
          where: { memberId_date_contextKey: { memberId: e.memberId, date, contextKey: d.contextKey } },
          create: { memberId: e.memberId, date, contextKey: d.contextKey, status: e.status, note: e.note || null, recordedById: user.id, ...link },
          update: { status: e.status, note: e.note || null, recordedById: user.id },
        }),
      ),
    );

    const newlyAbsent = d.entries.filter((e) => e.status === "ABSENT" && before[e.memberId]?.status !== "ABSENT");
    if (newlyAbsent.length) {
      const ctxName =
        ctx.kind === "group"
          ? (await db.group.findUnique({ where: { id: ctx.id }, select: { name: true } }))?.name
          : (await db.activity.findUnique({ where: { id: ctx.id }, select: { title: true } }))?.title;
      // Stored notifications are plain text: written in the association's default language.
      const t = await getTranslations({ locale: "fr", namespace: "attendance.notify" });
      const names = new Map(roster.members.map((m) => [m.id, m.firstName]));
      await Promise.all(
        newlyAbsent.map((e) =>
          notifyGuardians(e.memberId, {
            type: "ATTENDANCE",
            title: t("title", { name: names.get(e.memberId) ?? "" }),
            body: t("body", { context: ctxName ?? "", date: formatDate(date, "fr", "long") }),
            link: `/dashboard/members/${e.memberId}?tab=attendance`,
          }),
        ),
      );
    }

    const counts = Object.fromEntries(ATTENDANCE_STATUSES.map((s) => [s, d.entries.filter((e) => e.status === s).length]));
    await audit(user.id, "record", "Attendance", d.contextKey, { date: d.date, ...counts, notified: newlyAbsent.length });
    revalidatePath("/dashboard/attendance");
    revalidatePath(ctx.kind === "group" ? `/dashboard/groups/${ctx.id}` : `/dashboard/activities/${ctx.id}`);
    return { saved: d.entries.length, notified: newlyAbsent.length };
  });
}

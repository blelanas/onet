import { revalidatePath } from "@api/lib/cache";
import { z } from "zod";
import { db } from "@api/lib/db";
import { requirePermission } from "@api/lib/auth/guards";
import { formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { CALENDAR_ENTRY_TYPES } from "@api/lib/constants";
import { normalizeDay } from "@api/modules/attendance/day";
import { ENTRY_AUDIENCES } from "./constants";
import { parseFormDate } from "@onet/shared";


/** "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm" (local time). */
function parseWhen(v: unknown) {
  if (typeof v !== "string" || !v) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return normalizeDay(v);
  const d = parseFormDate(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
const whenReq = z.preprocess(parseWhen, z.date({ error: "errors.required" }));
const whenOpt = z.preprocess(parseWhen, z.date().optional());

const entrySchema = z
  .object({
    id: zs.optId,
    title: zs.reqStr(140),
    description: zs.optStr,
    type: z.enum(CALENDAR_ENTRY_TYPES),
    allDay: zs.bool,
    startAt: whenReq,
    endAt: whenOpt,
    location: zs.optStr,
    audience: z.enum(ENTRY_AUDIENCES),
  })
  .refine((d) => !d.endAt || d.endAt >= d.startAt, { path: ["endAt"], message: "errors.validation" });

export async function saveCalendarEntry(fd: FormData | Record<string, unknown>) {
  const obj = formToObject(fd);
  obj.allDay = obj.allDay ?? false;
  // The form posts date-only fields for all-day entries and datetime fields otherwise.
  if (obj.allDay === true) {
    obj.startAt = obj.startDay;
    obj.endAt = obj.endDay;
  }
  return runAction(entrySchema, obj, async (d) => {
    const user = await requirePermission("calendar.manage");
    const { id, ...f } = d;
    const data = {
      ...f,
      startAt: f.allDay ? normalizeDay(f.startAt) : f.startAt,
      endAt: f.endAt ? (f.allDay ? normalizeDay(f.endAt) : f.endAt) : null,
      description: f.description ?? null,
      location: f.location ?? null,
    };
    const e = id ? await db.calendarEntry.update({ where: { id }, data }) : await db.calendarEntry.create({ data: { ...data, createdById: user.id } });
    await audit(user.id, id ? "update" : "create", "CalendarEntry", e.id, { title: e.title });
    revalidatePath("/dashboard/calendar");
    return { id: e.id };
  });
}

export async function deleteCalendarEntry(id: string) {
  return runAction(zs.id, id, async (entryId) => {
    const user = await requirePermission("calendar.manage");
    const e = await db.calendarEntry.delete({ where: { id: entryId } });
    await audit(user.id, "delete", "CalendarEntry", entryId, { title: e.title });
    revalidatePath("/dashboard/calendar");
  });
}

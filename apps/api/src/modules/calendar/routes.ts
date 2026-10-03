import { Router, type Request } from "express";
import { can, requirePermission } from "@api/lib/auth/guards";
import { mutation, param, qs, query } from "@api/lib/http";
import { addDaysLocal, normalizeDay, parseDayParam, startOfMonth, startOfWeek } from "@api/modules/attendance/day";
import { CAL_KINDS, calendarGroupOptions, calendarItems, getEntry, type CalKind } from "./queries";
import { deleteCalendarEntry, saveCalendarEntry } from "./actions";

/** calendar module routes (mounted under /api). */
export const router = Router();

const VIEWS = ["month", "week", "agenda"] as const;

/**
 * Calendar items for the visible range (month grid / week / month agenda around ?d=), with the
 * user's personal scope ("mine") and kind/group filters. Recurring activities and group meetings
 * are expanded into weekly occurrences.
 */
export async function calendarPage(req: Request) {
  const user = await requirePermission("calendar.read");
  const view = (VIEWS as readonly string[]).includes(qs(req, "view") ?? "") ? (qs(req, "view") as (typeof VIEWS)[number]) : "month";
  const anchor = parseDayParam(qs(req, "d")) ?? normalizeDay();
  const typesParam = qs(req, "types");
  const kinds: CalKind[] = typesParam ? (typesParam.split(",").filter((k) => (CAL_KINDS as readonly string[]).includes(k)) as CalKind[]) : [...CAL_KINDS];
  const personal = user.roles.some((r) => r === "parent" || r === "kid" || r === "monitor" || r === "member");
  const defaultMine = user.roles.includes("parent") || (user.roles.includes("kid") && user.roles.length === 1);
  const mine = personal && (qs(req, "scope") ? qs(req, "scope") === "mine" : defaultMine);
  const groups = await calendarGroupOptions(user);
  const groupId = groups.some((g) => g.id === qs(req, "group")) ? qs(req, "group") : undefined;

  // Visible range (same grid as the web app computes for rendering).
  let from: Date;
  let to: Date;
  if (view === "week") {
    from = startOfWeek(anchor);
    to = addDaysLocal(from, 7);
  } else {
    const m = startOfMonth(anchor);
    const monthDays = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    if (view === "month") {
      from = startOfWeek(m);
      const cells = Math.ceil((((m.getDay() + 6) % 7) + monthDays) / 7) * 7;
      to = addDaysLocal(from, cells);
    } else {
      from = m;
      to = addDaysLocal(m, monthDays);
    }
  }
  const items = await calendarItems(user, { from, to, kinds, groupId, mine });
  return { items, groups, groupId: groupId ?? null, kinds, mine, personal, view };
}
router.get("/calendar", query(calendarPage));

/** One free calendar entry (audience-filtered). */
export async function calendarEntryPage(req: Request) {
  const user = await requirePermission("calendar.read");
  const e = await getEntry(user, param(req, "id"));
  return { ...e, canManage: can(user, "calendar.manage") };
}
router.get("/calendar/entries/:id", query(calendarEntryPage));

router.post(
  "/calendar/entries",
  mutation((req) => saveCalendarEntry(req.body)),
);
router.delete(
  "/calendar/entries/:id",
  mutation((req) => deleteCalendarEntry(param(req, "id"))),
);

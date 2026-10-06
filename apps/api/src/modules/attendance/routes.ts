import { Router, type Request } from "express";
import { requirePermission } from "@api/lib/auth/guards";
import { audit } from "@api/lib/audit";
import { AuthError } from "@api/lib/auth/guards";
import { mutation, qs, query, sendCsv } from "@api/lib/http";
import { toCsv, toDateInput } from "@onet/shared";
import { addDaysLocal, dayKey, normalizeDay, parseContextKey, parseDayParam } from "./day";
import { assertContextAllowed, attendanceContexts, childrenAttendance, defaultDate, exportRows, memberRates, rosterFor, sessionsFor } from "./queries";
import { saveAttendance } from "./actions";

/** attendance module routes (mounted under /api). */
export const router = Router();

/** Roll call: context options, the selected context/date and its roster. */
export async function rollPage(req: Request) {
  const user = await requirePermission("attendance.manage");
  const options = await attendanceContexts(user);
  if (!options.length) return { options, roll: null };

  const today = normalizeDay();
  // Default context: the one meeting today, else the first group.
  const ctxParam = qs(req, "ctx");
  const opt = options.find((o) => o.key === ctxParam) ?? options.find((o) => o.day === today.getDay()) ?? options[0];
  const ctx = parseContextKey(opt.key)!;
  await assertContextAllowed(user, ctx);
  const date = parseDayParam(qs(req, "date")) ?? defaultDate(opt.day);
  const step = opt.day == null ? 1 : 7;
  const prev = addDaysLocal(date, -step);
  const next = addDaysLocal(date, step);
  const roster = await rosterFor(ctx, date);

  return {
    options,
    roll: {
      opt,
      date: dayKey(date),
      prevDate: dayKey(prev),
      nextDate: next <= today ? dayKey(next) : null,
      future: date > today,
      offDay: opt.day != null && date.getDay() !== opt.day,
      recordedAt: roster.recordedAt,
      statuses: roster.statuses,
      // Medical notes stay on the server: the roll call only shows a flag.
      members: roster.members.map((m) => ({ id: m.id, firstName: m.firstName, lastName: m.lastName, photoUrl: m.photoUrl, dateOfBirth: m.dateOfBirth, medical: !!m.medicalNotes })),
    },
  };
}
router.get("/attendance/roll", query(rollPage));

const PERIODS = ["4", "8", "12", "26"];

/** History: sessions & per-child rates over the period for one or all of the user's contexts. */
export async function historyPage(req: Request) {
  const user = await requirePermission("attendance.manage");
  const options = await attendanceContexts(user);
  const selected = options.find((o) => o.key === qs(req, "ctx")) ?? null;
  const keys = selected ? [selected.key] : options.map((o) => o.key);
  const weeks = PERIODS.includes(qs(req, "weeks") ?? "") ? Number(qs(req, "weeks")) : 8;
  const to = normalizeDay();
  const from = addDaysLocal(to, -weeks * 7);
  const [sessions, rates] = await Promise.all([sessionsFor(keys, from, to), memberRates(keys, from, to)]);
  return { options, selected, sessions, rates, from: dayKey(from), to: dayKey(to) };
}
router.get("/attendance/history", query(historyPage));

/** Parents: their children's attendance (heatmap + recent records). */
export async function familyPage() {
  const user = await requirePermission("attendance.read");
  const data = await childrenAttendance(user, 16);
  return {
    children: data.map(({ child: c, records }) => ({
      child: { id: c.id, firstName: c.firstName, lastName: c.lastName, photoUrl: c.photoUrl, group: c.group ? { name: c.group.name, color: c.group.color } : null },
      records,
    })),
  };
}
router.get("/attendance/family", query(familyPage));

/** CSV export of attendance rows, limited to the contexts the user may manage. */
router.get(
  "/attendance/export.csv",
  query(async (req, res) => {
    const user = await requirePermission("attendance.manage");
    const allowed = (await attendanceContexts(user)).map((o) => o.key);
    const ctx = qs(req, "ctx");
    if (ctx && !allowed.includes(ctx)) throw new AuthError("FORBIDDEN");
    const to = parseDayParam(qs(req, "to")) ?? normalizeDay();
    const from = parseDayParam(qs(req, "from")) ?? addDaysLocal(to, -56);
    const rows = await exportRows(ctx ? [ctx] : allowed, from, to);
    await audit(user.id, "export", "Attendance", ctx ?? null, { count: rows.length, from: toDateInput(from), to: toDateInput(to) });
    sendCsv(
      res,
      `onet-presences-${toDateInput(from)}_${toDateInput(to)}.csv`,
      toCsv([
        ["date", "context", "contextType", "membershipNumber", "firstName", "lastName", "status", "note", "recordedBy"],
        ...rows.map((r) => [
          toDateInput(r.date),
          r.group?.name ?? r.activity?.title ?? r.contextKey,
          r.contextKey.split(":")[0],
          r.member.membershipNumber,
          r.member.firstName,
          r.member.lastName,
          r.status,
          r.note,
          r.recordedBy?.name,
        ]),
      ]),
    );
  }),
);

router.post(
  "/attendance",
  mutation((req) => saveAttendance(req.body)),
);

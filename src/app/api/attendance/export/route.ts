import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { csvResponse } from "@/lib/csv";
import { toDateInput } from "@/lib/dates";
import { addDaysLocal, normalizeDay, parseDayParam } from "@/server/attendance/day";
import { attendanceContexts, exportRows } from "@/server/attendance/queries";

/** CSV export of attendance rows, limited to the contexts the user may manage. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "errors.unauthenticated" }, { status: 401 });
  if (!can(user, "attendance.manage")) return NextResponse.json({ error: "errors.forbidden" }, { status: 403 });
  const sp = new URL(req.url).searchParams;
  const allowed = (await attendanceContexts(user)).map((o) => o.key);
  const ctx = sp.get("ctx");
  if (ctx && !allowed.includes(ctx)) return NextResponse.json({ error: "errors.forbidden" }, { status: 403 });
  const to = parseDayParam(sp.get("to")) ?? normalizeDay();
  const from = parseDayParam(sp.get("from")) ?? addDaysLocal(to, -56);
  const rows = await exportRows(ctx ? [ctx] : allowed, from, to);
  await audit(user.id, "export", "Attendance", ctx, { count: rows.length, from: toDateInput(from), to: toDateInput(to) });
  return csvResponse(`onet-presences-${toDateInput(from)}_${toDateInput(to)}.csv`, [
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
  ]);
}

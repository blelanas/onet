import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { csvResponse } from "@/lib/csv";
import { toDateInput } from "@/lib/dates";
import { listMembers } from "@/server/members/queries";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "errors.unauthenticated" }, { status: 401 });
  if (!can(user, "members.export")) return NextResponse.json({ error: "errors.forbidden" }, { status: 403 });
  const sp = new URL(req.url).searchParams;
  const { rows } = await listMembers(user, { q: sp.get("q") ?? undefined, type: sp.get("type") ?? undefined, status: sp.get("status") ?? undefined, groupId: sp.get("group") ?? undefined });
  await audit(user.id, "export", "Member", null, { count: rows.length });
  return csvResponse(`onet-membres-${toDateInput(new Date())}.csv`, [
    ["membershipNumber", "type", "firstName", "lastName", "firstNameAr", "lastNameAr", "dateOfBirth", "gender", "phone", "email", "address", "group", "membershipStatus", "membershipDate", "parents"],
    ...rows.map((m) => [
      m.membershipNumber, m.type, m.firstName, m.lastName, m.firstNameAr, m.lastNameAr, toDateInput(m.dateOfBirth), m.gender, m.phone, m.email, m.address,
      m.group?.name, m.membershipStatus, toDateInput(m.membershipDate), m.parentLinks.map((p) => `${p.parent.firstName} ${p.parent.lastName}`).join(" / "),
    ]),
  ]);
}

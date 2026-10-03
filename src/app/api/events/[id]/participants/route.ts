import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canAny } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { csvResponse } from "@/lib/csv";
import { db } from "@/lib/db";
import { toDateInput } from "@/lib/dates";
import { slugify } from "@/lib/utils";
import { eventParticipants, paymentState } from "@/server/registrations/queries";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "errors.unauthenticated" }, { status: 401 });
  if (!canAny(user, "registrations.manage", "events.manage")) return NextResponse.json({ error: "errors.forbidden" }, { status: 403 });
  const { id } = await params;
  const event = await db.event.findUnique({ where: { id }, select: { title: true, startAt: true } });
  if (!event) return NextResponse.json({ error: "errors.notFound" }, { status: 404 });
  const rows = await eventParticipants(id);
  await audit(user.id, "export", "EventRegistration", id, { count: rows.length });
  return csvResponse(`participants-${slugify(event.title)}-${toDateInput(event.startAt)}.csv`, [
    ["membershipNumber", "firstName", "lastName", "dateOfBirth", "group", "status", "payment", "invoiceNumber", "amountTND", "guardian", "guardianPhone", "registeredBy", "registeredAt", "notes"],
    ...rows.map((r) => [
      r.member.membershipNumber,
      r.member.firstName,
      r.member.lastName,
      toDateInput(r.member.dateOfBirth),
      r.member.group?.name,
      r.status,
      paymentState(r.invoice),
      r.invoice?.number,
      r.invoice ? r.invoice.amount / 1000 : 0,
      r.member.parentLinks[0] ? `${r.member.parentLinks[0].parent.firstName} ${r.member.parentLinks[0].parent.lastName}` : "",
      r.member.parentLinks[0]?.parent.phone,
      r.registeredBy?.name,
      toDateInput(r.createdAt),
      r.notes,
    ]),
  ]);
}

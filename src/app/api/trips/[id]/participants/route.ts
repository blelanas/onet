import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canAny } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { csvResponse } from "@/lib/csv";
import { db } from "@/lib/db";
import { toDateInput } from "@/lib/dates";
import { slugify } from "@/lib/utils";
import { paymentState, tripParticipants } from "@/server/registrations/queries";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "errors.unauthenticated" }, { status: 401 });
  const { id } = await params;
  const trip = await db.trip.findUnique({ where: { id }, select: { title: true, departAt: true, monitors: { select: { memberId: true } } } });
  if (!trip) return NextResponse.json({ error: "errors.notFound" }, { status: 404 });
  const supervises = !!user.memberId && trip.monitors.some((m) => m.memberId === user.memberId);
  if (!canAny(user, "registrations.manage", "trips.manage") && !supervises) return NextResponse.json({ error: "errors.forbidden" }, { status: 403 });
  const rows = await tripParticipants(id);
  await audit(user.id, "export", "TripRegistration", id, { count: rows.length });
  return csvResponse(`participants-${slugify(trip.title)}-${toDateInput(trip.departAt)}.csv`, [
    ["membershipNumber", "firstName", "lastName", "dateOfBirth", "group", "status", "parentConsent", "documents", "payment", "invoiceNumber", "amountTND", "guardian", "guardianPhone", "medicalNotes", "registeredBy", "registeredAt", "notes"],
    ...rows.map((r) => [
      r.member.membershipNumber,
      r.member.firstName,
      r.member.lastName,
      toDateInput(r.member.dateOfBirth),
      r.member.group?.name,
      r.status,
      r.parentConsent ? "yes" : "no",
      r.documentsStatus,
      paymentState(r.invoice),
      r.invoice?.number,
      r.invoice ? r.invoice.amount / 1000 : 0,
      r.member.parentLinks[0] ? `${r.member.parentLinks[0].parent.firstName} ${r.member.parentLinks[0].parent.lastName}` : "",
      r.member.parentLinks[0]?.parent.phone,
      r.member.medicalNotes,
      r.registeredBy?.name,
      toDateInput(r.createdAt),
      r.notes,
    ]),
  ]);
}

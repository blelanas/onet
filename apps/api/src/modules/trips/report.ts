import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { AuthError, can } from "@api/lib/auth/guards";
import { getTranslations } from "@api/lib/i18n";
import { ACTIVE_STATUSES } from "@api/modules/registrations/service";
import { slugify, toCsv, toDateInput } from "@onet/shared";
import { canManageTrip } from "./access";
import { tripParticipantRows, tripTotals } from "./participants";

/** Trip managers (and admins) or anyone with finance.read (accountants). */
export async function requireReportAccess(user: CurrentUser, tripId: string) {
  if (can(user, "finance.read")) return;
  if (!(await canManageTrip(user, tripId))) throw new AuthError("FORBIDDEN");
}

/**
 * The trip report sent to the accountants when a manager finalizes the list: trip, managers,
 * finalization, the active participants with what each one owes / paid, and totals.
 */
export async function tripReport(tripId: string) {
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      title: true,
      destination: true,
      category: true,
      status: true,
      departureLocation: true,
      departAt: true,
      returnAt: true,
      price: true,
      capacity: true,
      listClosedAt: true,
      listClosedById: true,
      monitors: { select: { member: { select: { id: true, firstName: true, lastName: true, phone: true, photoUrl: true } } } },
    },
  });
  if (!trip) throw new AuthError("NOT_FOUND");
  const [rows, closedBy] = await Promise.all([
    tripParticipantRows(tripId),
    trip.listClosedById ? db.user.findUnique({ where: { id: trip.listClosedById }, select: { name: true } }) : Promise.resolve(null),
  ]);
  const { monitors, listClosedById: _closedById, ...info } = trip;
  return {
    trip: info,
    managers: monitors.map((m) => ({ memberId: m.member.id, name: `${m.member.firstName} ${m.member.lastName}`, phone: m.member.phone, photoUrl: m.member.photoUrl })),
    finalized: trip.listClosedAt ? { at: trip.listClosedAt, by: closedBy?.name ?? null } : null,
    participants: rows.filter((r) => ACTIVE_STATUSES.includes(r.status)),
    /** Cancelled registrations that still hold money (to refund). */
    refunds: rows.filter((r) => r.status === "CANCELLED" && r.paid > 0),
    totals: tripTotals(rows),
    generatedAt: new Date(),
  };
}
export type TripReport = Awaited<ReturnType<typeof tripReport>>;

/** The report as CSV (UTF-8 with BOM, localized headers; amounts in TND). */
export async function tripReportCsv(report: TripReport) {
  const t = await getTranslations("trips.report.csv");
  const tc = await getTranslations("common");
  const tnd = (millimes: number) => (millimes / 1000).toFixed(3);
  const rows: (string | number | null | undefined)[][] = [
    [t("name"), t("type"), t("age"), t("phone"), t("guardian"), t("amountDue"), t("paid"), t("remaining"), t("methods"), t("status"), t("membershipNumber")],
    ...report.participants.map((r) => [
      `${r.member.firstName} ${r.member.lastName}`,
      t(`types.${r.type}`),
      r.age,
      r.phone,
      r.guardian?.name,
      tnd(r.amountDue),
      tnd(r.paid),
      tnd(r.remaining),
      r.methods.map((m) => tc(`enums.paymentMethod.${m}`)).join(" + "),
      tc(`status.${r.status}`),
      r.member.membershipNumber,
    ]),
    [],
    [t("totalParticipants"), report.totals.participants],
    [t("expected"), tnd(report.totals.expected)],
    [t("collected"), tnd(report.totals.collected)],
    [t("outstanding"), tnd(report.totals.outstanding)],
    ...report.totals.byMethod.map((m) => [tc(`enums.paymentMethod.${m.method}`), tnd(m.amount)]),
  ];
  return { filename: `report-${slugify(report.trip.title)}-${toDateInput(report.trip.departAt)}.csv`, csv: toCsv(rows) };
}

import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { myChildren } from "@api/lib/auth/scope";
import { AuthError } from "@api/lib/auth/guards";
import { addDays, startOfDay } from "@api/lib/dates";
import { startOfWeek } from "./common";
import { attendanceSummary, childSessions, publicKid } from "./parent";

/** Summary card data for every child of the current parent. */
export async function myChildrenOverview(user: CurrentUser) {
  const kids = await myChildren(user);
  const today = startOfDay();
  return Promise.all(
    kids.map(async (k) => {
      const [att, next, badges] = await Promise.all([
        attendanceSummary(k.id),
        childSessions(k, new Date(), addDays(today, 8)),
        db.memberBadge.count({ where: { memberId: k.id } }),
      ]);
      return { ...publicKid(k), attendance: att, next: next[0] ?? null, badges };
    }),
  );
}

/** Detailed sections for one child — guardianship enforced. */
export async function myChildDetail(user: CurrentUser, childId: string) {
  const kids = await myChildren(user);
  if (!kids.some((k) => k.id === childId)) throw new AuthError("FORBIDDEN");
  const weekStart = startOfWeek();
  const [child, week, history, events, trips] = await Promise.all([
    db.member.findUniqueOrThrow({
      where: { id: childId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        firstNameAr: true,
        lastNameAr: true,
        photoUrl: true,
        dateOfBirth: true,
        gender: true,
        membershipNumber: true,
        membershipDate: true,
        membershipStatus: true,
        medicalNotes: true,
        points: true,
        groupId: true,
        group: {
          select: {
            id: true,
            name: true,
            color: true,
            schedule: true,
            location: true,
            monitors: { select: { isLead: true, member: { select: { id: true, firstName: true, lastName: true, photoUrl: true, userId: true } } } },
          },
        },
        activityEnrollments: { select: { activity: { select: { id: true, title: true, category: true, schedule: true } } } },
      },
    }),
    childSessions({ id: childId, groupId: kids.find((k) => k.id === childId)!.groupId }, weekStart, addDays(weekStart, 7)),
    db.attendance.findMany({
      where: { memberId: childId },
      orderBy: { date: "desc" },
      take: 24,
      select: { id: true, date: true, status: true, group: { select: { name: true, color: true } }, activity: { select: { title: true } }, event: { select: { title: true } }, trip: { select: { title: true } } },
    }),
    db.eventRegistration.findMany({ where: { memberId: childId }, orderBy: { event: { startAt: "desc" } }, take: 8, select: { id: true, status: true, event: { select: { id: true, title: true, startAt: true } } } }),
    db.tripRegistration.findMany({ where: { memberId: childId }, orderBy: { trip: { departAt: "desc" } }, take: 8, select: { id: true, status: true, parentConsent: true, documentsStatus: true, trip: { select: { id: true, title: true, departAt: true } } } }),
  ]);
  const registrations = [
    ...events.map((r) => ({ id: r.id, kind: "event" as const, status: r.status, title: r.event.title, at: r.event.startAt, href: `/dashboard/events/${r.event.id}`, documentsStatus: null as string | null })),
    ...trips.map((r) => ({ id: r.id, kind: "trip" as const, status: r.status, title: r.trip.title, at: r.trip.departAt, href: `/dashboard/trips/${r.trip.id}`, documentsStatus: r.documentsStatus as string | null })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  return { child, week, history, registrations };
}

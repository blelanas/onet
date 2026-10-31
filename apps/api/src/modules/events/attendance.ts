import type { Request } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { ageFrom, ATTENDANCE_STATUSES, defaultSession, eventSessions, zonedDayKey, type AttendanceStatus } from "@onet/shared";
import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { AuthError, requirePermission } from "@api/lib/auth/guards";
import { ActionError, formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { param, qs } from "@api/lib/http";
import { dayKey, normalizeDay } from "@api/modules/attendance/day";
import { editionAccess, seesAllKids } from "./access";
import { ACTIVE_STATUSES } from "@api/modules/registrations/service";
import { getEvent } from "./queries";

/**
 * Group attendance of an event (edition or one-off event with teams): one roll call per team and per session
 * (a day of eventSessions(): start day, every day, every week or every month). Rows are Attendance with the
 * contextKey "event:<eventId>" (the same key as the staff check-in of one-off events, so an event keeps one
 * row per kid and per day), `eventId` set and the recorder.
 *
 * Who:
 *  - records: admins (events.manage) and the event's director for every team; a team's leader for their own
 *    team only (while their membership is ACTIVE);
 *  - views: the above, the users who see every kid (members.read_all) and the team members (their teams only);
 *  - anyone else: 403.
 * Only kids actively registered in that team (PENDING / CONFIRMED: not on the waiting list, not cancelled) are
 * listed and can be marked. Counts and rates only use the rows of the event's current past sessions (its dates
 * or frequency may have changed since a row was saved).
 */

export const eventContextKey = (eventId: string) => `event:${eventId}`;

/** Attendance.date of a session ("YYYY-MM-DD"): that day at 00:00 server time, like the groups' attendance. */
export const sessionDate = (key: string) => normalizeDay(key);

/** Today in the association's time zone. */
export const todayKey = () => zonedDayKey(new Date());

/** Registrations taking part in the roll call: kids with an active registration (not waitlisted nor cancelled). */
const ROLL_CALL_REG: Prisma.EventRegistrationWhereInput = { status: { in: ACTIVE_STATUSES }, member: { type: "CHILD" } };

/** "Present" in the counts: there (on time or late). */
const ATTENDED = new Set(["PRESENT", "LATE"]);

type TeamRef = { id: string };

/** Teams of the event the user may see / record the attendance of; 403 when none. */
async function attendanceRights(user: CurrentUser, eventId: string, teams: TeamRef[]) {
  const a = await editionAccess(user, eventId);
  const everyTeam = a.manage || a.isDirector || seesAllKids(user);
  if (!everyTeam && !a.isOnTeam) throw new AuthError("FORBIDDEN");
  const recordAll = a.manage || a.isDirector;
  return {
    view: teams.filter((t) => everyTeam || a.myTeamIds.includes(t.id)).map((t) => t.id),
    record: new Set(teams.filter((t) => recordAll || a.ledTeamIds.includes(t.id)).map((t) => t.id)),
  };
}

/** May the user record the attendance of this team (admins, the director, the team's ACTIVE leader)? */
export async function canRecordTeam(user: CurrentUser, eventId: string, teamId: string) {
  const a = await editionAccess(user, eventId);
  return a.manage || a.isDirector || a.ledTeamIds.includes(teamId);
}

/** Status counts grouped by `key`: attended (present or late), absent, marked. */
function tally<T extends { status: string; _count: { _all: number } }>(rows: T[], key: (r: T) => string) {
  const out = new Map<string, { attended: number; absent: number; total: number }>();
  for (const r of rows) {
    const c = out.get(key(r)) ?? { attended: 0, absent: 0, total: 0 };
    c.total += r._count._all;
    if (ATTENDED.has(r.status)) c.attended += r._count._all;
    if (r.status === "ABSENT") c.absent += r._count._all;
    out.set(key(r), c);
  }
  return out;
}

/**
 * GET /events/:id/attendance?date=YYYY-MM-DD — the roll call of one session (default: today when it is a
 * session, else the latest past one, else the first) for the teams the user sees, the past sessions with their
 * "present / marked" counts, and each kid's attendance rate over the past sessions.
 */
export async function eventAttendancePage(req: Request) {
  const user = await requirePermission("events.read");
  const id = param(req, "id");
  const e = await getEvent(user, id);
  const allTeams = await db.eventTeam.findMany({
    where: { eventId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, color: true, leader: { select: { id: true, firstName: true, lastName: true } } },
  });
  const rights = await attendanceRights(user, id, allTeams);
  const sessions = eventSessions(e);
  const today = todayKey();
  const asked = qs(req, "date");
  const date = asked && sessions.includes(asked) ? asked : defaultSession(sessions, today);
  const teams = allTeams.filter((t) => rights.view.includes(t.id));

  const regs = await db.eventRegistration.findMany({
    where: { eventId: id, ...ROLL_CALL_REG, teamId: { in: teams.map((t) => t.id) } },
    orderBy: [{ member: { firstName: "asc" } }, { member: { lastName: "asc" } }],
    select: { teamId: true, member: { select: { id: true, firstName: true, lastName: true, photoUrl: true, dateOfBirth: true, medicalNotes: true } } },
  });
  const kidIds = regs.map((r) => r.member.id);
  const contextKey = eventContextKey(id);
  // Only the rows of the event's current past sessions count (not those of days that are no longer sessions).
  const pastSessions = sessions.filter((s) => s <= today);
  const past = { contextKey, memberId: { in: kidIds }, date: { in: pastSessions.map(sessionDate) } };
  const [rows, bySession, byKid] = await Promise.all([
    date ? db.attendance.findMany({ where: { contextKey, date: sessionDate(date), memberId: { in: kidIds } }, select: { memberId: true, status: true, note: true, updatedAt: true } }) : Promise.resolve([]),
    db.attendance.groupBy({ by: ["date", "status"], where: past, _count: { _all: true } }),
    db.attendance.groupBy({ by: ["memberId", "status"], where: past, _count: { _all: true } }),
  ]);
  const saved = new Map(rows.map((r) => [r.memberId, r]));

  const perSession = tally(bySession, (r) => dayKey(r.date));
  const perKid = tally(byKid, (r) => r.memberId);

  const i = date ? sessions.indexOf(date) : -1;
  return {
    event: { id: e.id, title: e.title },
    frequency: e.frequency,
    sessions,
    date,
    today,
    future: !!date && date > today,
    prevDate: i > 0 ? sessions[i - 1] : null,
    nextDate: i >= 0 && i < sessions.length - 1 ? sessions[i + 1] : null,
    canRecordAny: rights.record.size > 0,
    teams: teams.map((t) => {
      const kids = regs.filter((r) => r.teamId === t.id).map((r) => r.member);
      const marks = kids.map((k) => saved.get(k.id)).filter((x) => !!x);
      return {
        id: t.id,
        name: t.name,
        color: t.color,
        leader: t.leader ? `${t.leader.firstName} ${t.leader.lastName}` : null,
        canRecord: rights.record.has(t.id),
        // Medical notes stay on the server: the roll call only shows a flag.
        kids: kids.map((k) => ({ id: k.id, firstName: k.firstName, lastName: k.lastName, photoUrl: k.photoUrl, age: ageFrom(k.dateOfBirth), medical: !!k.medicalNotes })),
        statuses: Object.fromEntries(marks.map((m) => [m.memberId, { status: m.status, note: m.note ?? "" }])),
        present: marks.filter((m) => ATTENDED.has(m.status)).length,
        marked: marks.length,
        total: kids.length,
        recordedAt: marks.length ? marks.reduce((at, m) => (m.updatedAt > at ? m.updatedAt : at), marks[0].updatedAt) : null,
      };
    }),
    // Past sessions (newest first) with the number of kids marked present / marked, for the visible teams.
    history: [...pastSessions]
      .reverse()
      .map((s) => ({ date: s, present: perSession.get(s)?.attended ?? 0, marked: perSession.get(s)?.total ?? 0 })),
    // Each visible kid's rate over the past sessions where they were marked.
    rates: regs.map((r) => {
      const c = perKid.get(r.member.id) ?? { attended: 0, absent: 0, total: 0 };
      return {
        memberId: r.member.id,
        firstName: r.member.firstName,
        lastName: r.member.lastName,
        photoUrl: r.member.photoUrl,
        teamId: r.teamId,
        present: c.attended,
        absent: c.absent,
        marked: c.total,
        rate: c.total ? Math.round((c.attended / c.total) * 100) : null,
      };
    }),
  };
}

const entrySchema = z.object({ memberId: z.string().min(1).max(64), status: z.enum(ATTENDANCE_STATUSES), note: z.string().trim().max(300).optional() });

const schema = z
  .object({
    eventId: zs.id,
    teamId: zs.id,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "errors.validation"),
    entries: z.array(entrySchema).max(300).optional(),
  })
  .passthrough();

/**
 * POST /events/:id/attendance — { date, teamId, entries: [{ memberId, status, note? }] } (or form fields
 * `s_<kidId>` = PRESENT | ABSENT | LATE | EXCUSED): upserts one row per kid for that session. The date must be
 * one of the event's sessions and not in the future; every kid must be actively registered in that team.
 */
export async function saveEventAttendance(input: FormData | Record<string, unknown>) {
  return runAction(schema, formToObject(input), async (d) => {
    const user = await requirePermission("events.read");
    const event = await db.event.findUnique({ where: { id: d.eventId }, select: { id: true, title: true, startAt: true, endAt: true, frequency: true } });
    if (!event) throw new ActionError("errors.notFound");
    const team = await db.eventTeam.findUnique({ where: { id: d.teamId }, select: { id: true, eventId: true } });
    if (!team || team.eventId !== event.id) throw new ActionError("errors.validation");
    if (!(await canRecordTeam(user, event.id, team.id))) throw new AuthError("FORBIDDEN");
    if (!eventSessions(event).includes(d.date)) throw new ActionError("errors.notSession");
    if (d.date > todayKey()) throw new ActionError("errors.futureSession");

    const raw = d as Record<string, unknown>;
    const entries =
      d.entries ??
      Object.entries(raw)
        .filter(([k, v]) => k.startsWith("s_") && (ATTENDANCE_STATUSES as readonly string[]).includes(String(v)))
        .map(([k, v]) => ({ memberId: k.slice(2), status: String(v) as AttendanceStatus, note: undefined as string | undefined }));
    if (!entries.length) throw new ActionError("errors.required");
    if (new Set(entries.map((x) => x.memberId)).size !== entries.length) throw new ActionError("errors.validation");

    // Only the kids actively registered in this team.
    const regs = await db.eventRegistration.findMany({ where: { eventId: event.id, teamId: team.id, ...ROLL_CALL_REG }, select: { memberId: true } });
    const allowed = new Set(regs.map((r) => r.memberId));
    if (entries.some((x) => !allowed.has(x.memberId))) throw new ActionError("errors.validation");

    const date = sessionDate(d.date);
    const contextKey = eventContextKey(event.id);
    await db.$transaction(
      entries.map((x) =>
        db.attendance.upsert({
          where: { memberId_date_contextKey: { memberId: x.memberId, date, contextKey } },
          create: { memberId: x.memberId, date, contextKey, status: x.status, note: x.note || null, eventId: event.id, recordedById: user.id },
          update: { status: x.status, note: x.note || null, eventId: event.id, recordedById: user.id },
        }),
      ),
    );
    const counts = Object.fromEntries(ATTENDANCE_STATUSES.map((s) => [s, entries.filter((x) => x.status === s).length]));
    await audit(user.id, "record", "Attendance", contextKey, { date: d.date, teamId: team.id, ...counts });
    return { saved: entries.length, present: entries.filter((x) => ATTENDED.has(x.status)).length };
  });
}

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "net";
import type { Server } from "http";
import superjson from "superjson";
import { defaultFrequencyForKind, defaultSession, eventSessions, MAX_SESSIONS, zonedDayKey, zonedTimeToDate } from "@onet/shared";
import { createApp } from "@api/app";
import { db } from "@api/lib/db";

let server: Server;
let base = "";

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});
afterAll(async () => {
  await new Promise((r) => server.close(r));
  await db.$disconnect();
});

// Each request comes from its own client IP (trusted proxy hop) so the per-IP limiters don't interfere.
let ipSeq = 0;
async function call<T = Record<string, unknown>>(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
  ipSeq++;
  const res = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": `10.78.${Math.floor(ipSeq / 250)}.${ipSeq % 250}`,
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: (text ? superjson.parse(text) : null) as T };
}
type Result<T> = { ok: boolean; error?: string; data: T };

async function login(email: string) {
  const r = await call<Result<{ token: string }>>("POST", "/auth/login", { body: { email, password: "Onet2026!" } });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.data.token;
}
const memberIdOf = async (email: string) => (await db.member.findFirstOrThrow({ where: { OR: [{ user: { email } }, { email, type: { not: "PARENT" } }] }, select: { id: true } })).id;
const userIdOf = async (email: string) => (await db.user.findUniqueOrThrow({ where: { email }, select: { id: true } })).id;

const ADMIN = "gestion@onet-teboulba.tn";
const LEADER = "membre@onet-teboulba.tn"; // leads team A
const MEMBER = "moniteur@onet-teboulba.tn"; // on team A, not its leader
const DIRECTOR = "karim.jaziri@onet-teboulba.tn";
const OUTSIDER = "ines.bouzid@onet-teboulba.tn"; // on no team of the test edition
const ACCOUNTANT = "comptable@onet-teboulba.tn"; // members.read_all: sees every kid, records nothing
const SALMA = "salma.ayari@onet-teboulba.tn"; // leads team B (no login)

const DAY = 86400_000;
/** "YYYY-MM-DD" (Tunisian day) `days` from today. */
const dayFromToday = (days: number) => zonedDayKey(new Date(Date.now() + days * DAY));
/** Wall time in Tunis for a form field ("YYYY-MM-DDTHH:mm"). */
const at = (days: number, hm: string) => `${dayFromToday(days)}T${hm}`;

describe("event sessions", () => {
  const tunis = (y: number, m: number, d: number, h = 10) => zonedTimeToDate(y, m, d, h);

  it("ONCE is the start day, or every day when the event spans several days", () => {
    expect(eventSessions({ startAt: tunis(2026, 5, 4, 9), endAt: tunis(2026, 5, 4, 17), frequency: "ONCE" })).toEqual(["2026-05-04"]);
    expect(eventSessions({ startAt: tunis(2026, 5, 4), endAt: tunis(2026, 5, 6), frequency: "ONCE" })).toEqual(["2026-05-04", "2026-05-05", "2026-05-06"]);
    // Unknown frequency → ONCE; an end before the start → the start day only.
    expect(eventSessions({ startAt: tunis(2026, 5, 4), endAt: tunis(2026, 5, 4, 18), frequency: "YEARLY" })).toEqual(["2026-05-04"]);
    expect(eventSessions({ startAt: tunis(2026, 5, 4), endAt: tunis(2026, 5, 1), frequency: "DAILY" })).toEqual(["2026-05-04"]);
  });

  it("DAILY, WEEKLY and MONTHLY (the 31st falls back to the end of shorter months)", () => {
    expect(eventSessions({ startAt: tunis(2026, 2, 27), endAt: tunis(2026, 3, 2), frequency: "DAILY" })).toEqual(["2026-02-27", "2026-02-28", "2026-03-01", "2026-03-02"]);
    expect(eventSessions({ startAt: tunis(2026, 10, 3), endAt: tunis(2026, 10, 31, 18), frequency: "WEEKLY" })).toEqual(["2026-10-03", "2026-10-10", "2026-10-17", "2026-10-24", "2026-10-31"]);
    expect(eventSessions({ startAt: tunis(2026, 10, 3), endAt: tunis(2026, 10, 30), frequency: "WEEKLY" })).toHaveLength(4);
    expect(eventSessions({ startAt: tunis(2027, 1, 31), endAt: tunis(2027, 6, 30), frequency: "MONTHLY" })).toEqual(["2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30", "2027-05-31", "2027-06-30"]);
    expect(eventSessions({ startAt: tunis(2028, 1, 30), endAt: tunis(2028, 3, 1), frequency: "MONTHLY" })).toEqual(["2028-01-30", "2028-02-29"]);
    // A club season: every Saturday of the school year (across the new year).
    const club = eventSessions({ startAt: tunis(2026, 10, 3, 9), endAt: tunis(2027, 6, 26, 18), frequency: "WEEKLY" });
    expect(club[0]).toBe("2026-10-03");
    expect(club.at(-1)).toBe("2027-06-26");
    expect(club).toHaveLength(39);
  });

  it("is capped, and works in Tunisian days whatever the server's time zone", () => {
    expect(process.env.TZ).toBe("America/Los_Angeles");
    expect(eventSessions({ startAt: tunis(2026, 1, 1), endAt: tunis(2029, 1, 1), frequency: "DAILY" })).toHaveLength(MAX_SESSIONS);
    // 23:30 UTC on March 1st is 00:30 on March 2nd in Tunis (and still March 1st in Los Angeles).
    expect(eventSessions({ startAt: new Date("2026-03-01T23:30:00Z"), endAt: new Date("2026-03-02T10:00:00Z"), frequency: "ONCE" })).toEqual(["2026-03-02"]);
    expect(eventSessions({ startAt: new Date("2026-03-01T22:30:00Z"), endAt: new Date("2026-03-15T22:30:00Z"), frequency: "WEEKLY" })).toEqual(["2026-03-01", "2026-03-08", "2026-03-15"]);
  });

  it("defaults: today when it is a session, else the latest past one, else the first; frequency from the series kind", () => {
    const s = ["2026-10-03", "2026-10-10", "2026-10-17"];
    expect(defaultSession(s, "2026-10-10")).toBe("2026-10-10");
    expect(defaultSession(s, "2026-10-12")).toBe("2026-10-10");
    expect(defaultSession(s, "2026-12-01")).toBe("2026-10-17");
    expect(defaultSession(s, "2026-09-01")).toBe("2026-10-03");
    expect(defaultSession([], "2026-09-01")).toBeNull();
    expect([defaultFrequencyForKind("CLUB"), defaultFrequencyForKind("FESTIVAL"), defaultFrequencyForKind("OTHER")]).toEqual(["WEEKLY", "DAILY", "ONCE"]);
  });
});

let admin = "";
let leader = "";
let member = "";
let director = "";
let outsider = "";
let accountant = "";
let clubId = "";
let edition = "";
let teamA = "";
let teamB = "";
let kid1 = ""; // team A (added by the leader)
let reg1 = "";
let kid2 = ""; // team B (added by an admin)
let reg2 = "";

beforeAll(async () => {
  [admin, leader, member, director, outsider, accountant] = await Promise.all([login(ADMIN), login(LEADER), login(MEMBER), login(DIRECTOR), login(OUTSIDER), login(ACCOUNTANT)]);
});

describe("event frequency", () => {
  it("a new edition gets its series kind's frequency, or the previous edition's", async () => {
    const club = await call<Result<{ id: string }>>("POST", "/series", { token: admin, body: { name: "Club présences", kind: "CLUB" } });
    clubId = club.body.data.id;
    // Started three weeks ago (today is its 4th weekly session), ends in two months.
    const e = await call<Result<{ id: string }>>("POST", `/series/${clubId}/editions`, { token: admin, body: { startAt: at(-21, "10:00"), endAt: at(60, "12:00"), directorId: await memberIdOf(DIRECTOR) } });
    expect(e.body.ok, JSON.stringify(e.body)).toBe(true);
    edition = e.body.data.id;
    expect((await db.event.findUniqueOrThrow({ where: { id: edition } })).frequency).toBe("WEEKLY");

    const fest = await call<Result<{ id: string }>>("POST", "/series", { token: admin, body: { name: "Festival présences", kind: "FESTIVAL" } });
    const other = await call<Result<{ id: string }>>("POST", "/series", { token: admin, body: { name: "Autre présences", kind: "OTHER" } });
    const f1 = await call<Result<{ id: string }>>("POST", `/series/${fest.body.data.id}/editions`, { token: admin, body: { startAt: at(100, "09:00"), endAt: at(110, "18:00") } });
    const o1 = await call<Result<{ id: string }>>("POST", `/series/${other.body.data.id}/editions`, { token: admin, body: { startAt: at(100, "09:00"), endAt: at(100, "18:00") } });
    expect((await db.event.findUniqueOrThrow({ where: { id: f1.body.data.id } })).frequency).toBe("DAILY");
    expect((await db.event.findUniqueOrThrow({ where: { id: o1.body.data.id } })).frequency).toBe("ONCE");
    // An explicit frequency, then the next edition (and the form's proposal) copies it.
    const f2 = await call<Result<{ id: string }>>("POST", `/series/${fest.body.data.id}/editions`, { token: admin, body: { startAt: at(400, "09:00"), endAt: at(500, "18:00"), frequency: "MONTHLY" } });
    expect((await db.event.findUniqueOrThrow({ where: { id: f2.body.data.id } })).frequency).toBe("MONTHLY");
    expect((await call<{ next: { frequency: string } }>("GET", `/series/${fest.body.data.id}`, { token: admin })).body.next.frequency).toBe("MONTHLY");
    const f3 = await call<Result<{ id: string }>>("POST", `/series/${fest.body.data.id}/editions`, { token: admin, body: { startAt: at(800, "09:00"), endAt: at(810, "18:00") } });
    expect((await db.event.findUniqueOrThrow({ where: { id: f3.body.data.id } })).frequency).toBe("MONTHLY");
    expect((await call<Result<unknown>>("POST", `/series/${fest.body.data.id}/editions`, { token: admin, body: { startAt: at(900, "09:00"), endAt: at(910, "18:00"), frequency: "HOURLY" } })).body).toMatchObject({ ok: false, fieldErrors: { frequency: expect.any(String) } });
    await db.event.deleteMany({ where: { seriesId: { in: [fest.body.data.id, other.body.data.id] } } });
    await db.eventSeries.deleteMany({ where: { id: { in: [fest.body.data.id, other.body.data.id] } } });
  });

  it("the event form saves the frequency (absent: unchanged) and the detail shows the number of sessions", async () => {
    const body = { title: "Atelier mensuel", category: "WORKSHOP", startAt: at(10, "15:00"), endAt: at(200, "17:00"), capacity: 30, price: 0, status: "PUBLISHED", isPublic: true, frequency: "MONTHLY" };
    const r = await call<Result<{ id: string }>>("POST", "/events", { token: admin, body });
    expect(r.body.ok, JSON.stringify(r.body)).toBe(true);
    const id = r.body.data.id;
    try {
      const e = await db.event.findUniqueOrThrow({ where: { id } });
      expect(e.frequency).toBe("MONTHLY");
      const detail = await call<{ event: { frequency: string }; sessionsCount: number }>("GET", `/events/${id}`, { token: admin });
      expect(detail.body).toMatchObject({ event: { frequency: "MONTHLY" }, sessionsCount: eventSessions(e).length });
      expect(detail.body.sessionsCount).toBeGreaterThanOrEqual(6);
      const { frequency: _f, ...rest } = body;
      expect((await call<Result<unknown>>("POST", "/events", { token: admin, body: { ...rest, id } })).body.ok).toBe(true);
      expect((await db.event.findUniqueOrThrow({ where: { id } })).frequency).toBe("MONTHLY");
      expect((await call<Result<unknown>>("POST", "/events", { token: admin, body: { ...rest, id, frequency: "WEEKLY" } })).body.ok).toBe(true);
      expect((await db.event.findUniqueOrThrow({ where: { id } })).frequency).toBe("WEEKLY");
      expect((await call<Result<unknown>>("POST", "/events", { token: admin, body: { ...rest, id, frequency: "SOMETIMES" } })).body).toMatchObject({ ok: false, error: "errors.validation" });
    } finally {
      await db.event.delete({ where: { id } });
    }
  });
});

describe("a leader manages only their own team's kids", () => {
  it("sets up two teams: A led by the leader (with a team member), B led by someone else", async () => {
    const a = await call<Result<{ id: string }>>("POST", `/events/${edition}/teams`, { token: director, body: { name: "Les Soleils", color: "#FFB400", leaderId: await memberIdOf(LEADER), memberIds: [await memberIdOf(MEMBER)] } });
    const b = await call<Result<{ id: string }>>("POST", `/events/${edition}/teams`, { token: director, body: { name: "Les Lunes", color: "#1E9BD7", leaderId: await memberIdOf(SALMA), memberIds: [] } });
    expect(a.body.ok && b.body.ok, JSON.stringify([a.body, b.body])).toBe(true);
    teamA = a.body.data.id;
    teamB = b.body.data.id;
  });

  it("adds kids only into a team they lead", async () => {
    const kid = { firstName: "Lina", lastName: "Equipa", dateOfBirth: "2017-02-03", parentName: "Mounir Equipa", parentPhone: "+216 22 777 001" };
    expect((await call("POST", `/events/${edition}/kids`, { token: leader, body: kid })).body).toMatchObject({ ok: false, error: "errors.teamRequired" });
    expect((await call("POST", `/events/${edition}/kids`, { token: leader, body: { ...kid, teamId: teamB } })).status).toBe(403);
    expect(await db.member.count({ where: { firstName: "Lina", lastName: "Equipa" } })).toBe(0);
    const r = await call<Result<{ memberId: string; registrationId: string }>>("POST", `/events/${edition}/kids`, { token: leader, body: { ...kid, teamId: teamA } });
    expect(r.body.ok, JSON.stringify(r.body)).toBe(true);
    kid1 = r.body.data.memberId;
    reg1 = r.body.data.registrationId;
    // An existing kid: same rule.
    // A kid the leader has no rights on elsewhere (the card is shared by all the kid's editions: being the leader
    // of the kid's team, or the director, in another edition would let them edit it).
    const amel = await memberIdOf(LEADER);
    const existing = await db.member.findFirstOrThrow({
      where: { type: "CHILD", eventRegistrations: { none: { OR: [{ eventId: edition }, { team: { leaderId: amel } }, { event: { directorId: amel } }] } } },
      select: { id: true },
    });
    expect((await call("POST", `/events/${edition}/kids`, { token: leader, body: { memberId: existing.id, teamId: teamB } })).status).toBe(403);
    // Team members don't add kids.
    expect((await call("POST", `/events/${edition}/kids`, { token: member, body: { memberId: existing.id, teamId: teamA } })).status).toBe(403);
    // The director (and admins) add anywhere, with or without a team.
    const k2 = await call<Result<{ memberId: string; registrationId: string }>>("POST", `/events/${edition}/kids`, { token: director, body: { memberId: existing.id, teamId: teamB } });
    expect(k2.body.ok, JSON.stringify(k2.body)).toBe(true);
    kid2 = k2.body.data.memberId;
    reg2 = k2.body.data.registrationId;
  });

  it("moves, edits and removes only the kids of their team; takes an unassigned kid into it", async () => {
    // Kid of team B: untouchable.
    expect((await call("POST", `/events/${edition}/kids/${reg2}/team`, { token: leader, body: { teamId: teamA } })).status).toBe(403);
    expect((await call("DELETE", `/events/${edition}/kids/${reg2}`, { token: leader })).status).toBe(403);
    expect((await call("POST", `/kids/${kid2}`, { token: leader, body: { firstName: "Hack", lastName: "Ed" } })).status).toBe(403);
    // Own kid: not into a team they don't lead, nor out of any team.
    expect((await call("POST", `/events/${edition}/kids/${reg1}/team`, { token: leader, body: { teamId: teamB } })).status).toBe(403);
    expect((await call("POST", `/events/${edition}/kids/${reg1}/team`, { token: leader, body: { teamId: null } })).body).toMatchObject({ ok: false, error: "errors.teamRequired" });
    expect((await db.eventRegistration.findUniqueOrThrow({ where: { id: reg1 } })).teamId).toBe(teamA);
    expect((await call("POST", `/kids/${kid1}`, { token: leader, body: { firstName: "Lina", lastName: "Equipa", dateOfBirth: "2017-02-03", parentPhone: "+216 22 777 002" } })).body).toMatchObject({ ok: true });
    // An unassigned kid: the leader can take them into their team (and then manage them).
    expect((await call("POST", `/events/${edition}/kids/${reg2}/team`, { token: admin, body: { teamId: null } })).body).toMatchObject({ ok: true });
    expect((await call("DELETE", `/events/${edition}/kids/${reg2}`, { token: leader })).status).toBe(403);
    expect((await call("POST", `/kids/${kid2}`, { token: leader, body: { firstName: "Hack", lastName: "Ed" } })).status).toBe(403);
    expect((await call("POST", `/events/${edition}/kids/${reg2}/team`, { token: leader, body: { teamId: teamA } })).body).toMatchObject({ ok: true, data: { teamId: teamA } });
    // The director moves kids between any teams.
    expect((await call("POST", `/events/${edition}/kids/${reg2}/team`, { token: director, body: { teamId: teamB } })).body).toMatchObject({ ok: true, data: { teamId: teamB } });
    // Team members stay read-only.
    expect((await call("POST", `/events/${edition}/kids/${reg1}/team`, { token: member, body: { teamId: teamA } })).status).toBe(403);
    expect((await call("DELETE", `/events/${edition}/kids/${reg1}`, { token: member })).status).toBe(403);
    expect((await call("POST", `/kids/${kid1}`, { token: member, body: { firstName: "X", lastName: "Y" } })).status).toBe(403);
  });

  it("the kids list tells the UI which kids the user manages", async () => {
    type Page = { canManage: boolean; canManageAll: boolean; ledTeamIds: string[]; rows: { registrationId: string; guardian: { phone: string | null } | null }[] };
    expect((await call<Page>("GET", `/events/${edition}/kids`, { token: leader })).body).toMatchObject({ canManage: true, canManageAll: false, ledTeamIds: [teamA] });
    expect((await call<Page>("GET", `/events/${edition}/kids`, { token: member })).body).toMatchObject({ canManage: false, canManageAll: false, ledTeamIds: [] });
    expect((await call<Page>("GET", `/events/${edition}/kids`, { token: director })).body).toMatchObject({ canManage: true, canManageAll: true });
    expect((await call<Page>("GET", `/events/${edition}/kids`, { token: admin })).body).toMatchObject({ canManage: true, canManageAll: true });
    // Reading is unchanged: a leader still lists every kid of the edition, with the parent contact.
    const rows = (await call<Page>("GET", `/events/${edition}/kids`, { token: leader })).body.rows;
    expect(rows.map((r) => r.registrationId).sort()).toEqual([reg1, reg2].sort());
    expect(rows.find((r) => r.registrationId === reg1)?.guardian?.phone).toBe("+216 22 777 002");
    expect((await call("GET", `/events/${edition}/kids`, { token: outsider })).status).toBe(403);
  });

  it("the director and admins edit and remove the kids of every team", async () => {
    const k2 = await db.member.findUniqueOrThrow({ where: { id: kid2 } });
    expect((await call("POST", `/kids/${kid2}`, { token: director, body: { firstName: k2.firstName, lastName: k2.lastName, dateOfBirth: k2.dateOfBirth } })).body).toMatchObject({ ok: true });
    const extra = await db.member.findFirstOrThrow({ where: { type: "CHILD", eventRegistrations: { none: { eventId: edition } } }, select: { id: true } });
    const r = await call<Result<{ registrationId: string }>>("POST", `/events/${edition}/kids`, { token: admin, body: { memberId: extra.id, teamId: teamB } });
    expect(r.body.ok).toBe(true);
    expect((await call("DELETE", `/events/${edition}/kids/${r.body.data.registrationId}`, { token: director })).body).toMatchObject({ ok: true });
  });
});

describe("group attendance of an event", () => {
  type Team = { id: string; canRecord: boolean; kids: { id: string }[]; statuses: Record<string, { status: string }>; present: number; total: number };
  type Page = { date: string; today: string; sessions: string[]; prevDate: string | null; teams: Team[]; history: { date: string; present: number; marked: number }[]; rates: { memberId: string; rate: number | null; marked: number }[]; canRecordAny: boolean };
  const today = () => dayFromToday(0);
  const start = () => dayFromToday(-21);

  it("shows today's session (weekly: 4th session) and the teams the user may see", async () => {
    const page = await call<Page>("GET", `/events/${edition}/attendance`, { token: leader });
    expect(page.status).toBe(200);
    expect(page.body.date).toBe(today());
    expect(page.body.sessions.slice(0, 4)).toEqual([dayFromToday(-21), dayFromToday(-14), dayFromToday(-7), today()]);
    expect(page.body.prevDate).toBe(dayFromToday(-7));
    // The leader sees and records their own team only.
    expect(page.body.teams.map((t) => [t.id, t.canRecord])).toEqual([[teamA, true]]);
    expect(page.body.teams[0].kids.map((k) => k.id)).toEqual([kid1]);
    // A team member: their team, read-only.
    expect((await call<Page>("GET", `/events/${edition}/attendance`, { token: member })).body.teams.map((t) => [t.id, t.canRecord])).toEqual([[teamA, false]]);
    // The director and admins: every team; members.read_all users view them.
    for (const token of [director, admin]) expect((await call<Page>("GET", `/events/${edition}/attendance`, { token })).body.teams.map((t) => [t.id, t.canRecord])).toEqual([[teamA, true], [teamB, true]]);
    expect((await call<Page>("GET", `/events/${edition}/attendance`, { token: accountant })).body).toMatchObject({ canRecordAny: false, teams: [{ id: teamA, canRecord: false }, { id: teamB, canRecord: false }] });
    expect((await call("GET", `/events/${edition}/attendance`, { token: outsider })).status).toBe(403);
    // Another session; a date that is not a session falls back to the default.
    expect((await call<Page>("GET", `/events/${edition}/attendance?date=${start()}`, { token: leader })).body.date).toBe(start());
    expect((await call<Page>("GET", `/events/${edition}/attendance?date=${dayFromToday(-20)}`, { token: leader })).body.date).toBe(today());
    // The detail offers the tab to the people who see the kids.
    expect((await call<{ canSeeAttendance: boolean }>("GET", `/events/${edition}`, { token: member })).body.canSeeAttendance).toBe(true);
    expect((await call<{ canSeeAttendance: boolean }>("GET", `/events/${edition}`, { token: outsider })).body.canSeeAttendance).toBe(false);
  });

  it("a leader records their team only; the director every team; others are refused", async () => {
    const r = await call<Result<{ saved: number; present: number }>>("POST", `/events/${edition}/attendance`, { token: leader, body: { date: today(), teamId: teamA, entries: [{ memberId: kid1, status: "PRESENT" }] } });
    expect(r.body, JSON.stringify(r.body)).toMatchObject({ ok: true, data: { saved: 1, present: 1 } });
    const rows = await db.attendance.findMany({ where: { memberId: kid1, contextKey: `event:${edition}` } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "PRESENT", eventId: edition, recordedById: await userIdOf(LEADER) });
    // Not the other team, not for the team member, the outsider or a read-only viewer.
    expect((await call("POST", `/events/${edition}/attendance`, { token: leader, body: { date: today(), teamId: teamB, entries: [{ memberId: kid2, status: "PRESENT" }] } })).status).toBe(403);
    for (const token of [member, outsider, accountant])
      expect((await call("POST", `/events/${edition}/attendance`, { token, body: { date: today(), teamId: teamA, entries: [{ memberId: kid1, status: "ABSENT" }] } })).status).toBe(403);
    // The director records team B.
    expect((await call("POST", `/events/${edition}/attendance`, { token: director, body: { date: today(), teamId: teamB, entries: [{ memberId: kid2, status: "ABSENT" }] } })).body).toMatchObject({ ok: true });
    expect(await db.attendance.count({ where: { contextKey: `event:${edition}` } })).toBe(2);
  });

  it("refuses dates that are not sessions (or not yet), and kids outside the team", async () => {
    const post = (body: Record<string, unknown>, token = leader) => call<Result<unknown>>("POST", `/events/${edition}/attendance`, { token, body: { teamId: teamA, entries: [{ memberId: kid1, status: "PRESENT" }], ...body } });
    expect((await post({ date: dayFromToday(-20) })).body).toMatchObject({ ok: false, error: "errors.notSession" });
    expect((await post({ date: dayFromToday(-20) })).status).toBe(400);
    expect((await post({ date: dayFromToday(7) })).body).toMatchObject({ ok: false, error: "errors.futureSession" });
    expect((await post({ date: "31/10/2026" })).body).toMatchObject({ ok: false, error: "errors.validation" });
    // Kid 2 is in team B: refused, nothing written.
    const before = await db.attendance.count({ where: { contextKey: `event:${edition}` } });
    expect((await post({ date: today(), entries: [{ memberId: kid1, status: "PRESENT" }, { memberId: kid2, status: "PRESENT" }] })).body).toMatchObject({ ok: false, error: "errors.validation" });
    expect((await post({ date: today(), teamId: teamB, entries: [{ memberId: kid1, status: "PRESENT" }] }, director)).body).toMatchObject({ ok: false, error: "errors.validation" });
    // A team of another event.
    const foreign = await db.eventTeam.findFirstOrThrow({ where: { eventId: { not: edition } } });
    expect((await post({ date: today(), teamId: foreign.id }, director)).body).toMatchObject({ ok: false, error: "errors.validation" });
    expect(await db.attendance.count({ where: { contextKey: `event:${edition}` } })).toBe(before);
  });

  it("keeps one row per kid and per day (upsert), also with s_<kidId> fields; past sessions count in the rates", async () => {
    expect((await call("POST", `/events/${edition}/attendance`, { token: leader, body: { date: today(), teamId: teamA, entries: [{ memberId: kid1, status: "ABSENT", note: "malade" }] } })).body).toMatchObject({ ok: true });
    expect((await call("POST", `/events/${edition}/attendance`, { token: leader, body: { date: today(), teamId: teamA, [`s_${kid1}`]: "LATE" } })).body).toMatchObject({ ok: true });
    const rows = await db.attendance.findMany({ where: { memberId: kid1, contextKey: `event:${edition}` } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "LATE", note: null });
    // A past session.
    expect((await call("POST", `/events/${edition}/attendance`, { token: leader, body: { date: start(), teamId: teamA, entries: [{ memberId: kid1, status: "ABSENT" }] } })).body).toMatchObject({ ok: true });
    const page = await call<Page>("GET", `/events/${edition}/attendance`, { token: leader });
    expect(page.body.teams[0]).toMatchObject({ statuses: { [kid1]: { status: "LATE" } }, present: 1, total: 1 });
    // History: newest first, the leader's teams only (kid 2's absence today is not counted for them).
    expect(page.body.history[0]).toEqual({ date: today(), present: 1, marked: 1 });
    expect(page.body.history.find((h) => h.date === start())).toEqual({ date: start(), present: 0, marked: 1 });
    expect(page.body.history).toHaveLength(4);
    expect(page.body.rates).toEqual([expect.objectContaining({ memberId: kid1, marked: 2, rate: 50 })]);
    const all = await call<Page>("GET", `/events/${edition}/attendance`, { token: director });
    expect(all.body.history[0]).toEqual({ date: today(), present: 1, marked: 2 });
    expect(all.body.rates.find((r) => r.memberId === kid2)).toMatchObject({ marked: 1, rate: 0 });
  });

  it("a suspended leader can't take the attendance any more", async () => {
    const amel = await memberIdOf(LEADER);
    await db.member.update({ where: { id: amel }, data: { membershipStatus: "SUSPENDED" } });
    try {
      expect((await call("POST", `/events/${edition}/attendance`, { token: leader, body: { date: today(), teamId: teamA, entries: [{ memberId: kid1, status: "PRESENT" }] } })).status).toBe(403);
      expect((await call("GET", `/events/${edition}/attendance`, { token: leader })).status).toBe(403);
    } finally {
      await db.member.update({ where: { id: amel }, data: { membershipStatus: "ACTIVE" } });
    }
  });

  it("a one-off event shares its attendance with the staff check-in (same context key and day)", async () => {
    const body = { title: "Journée plage", category: "CHILDREN", startAt: at(-2, "00:30"), endAt: at(-2, "17:00"), capacity: 40, price: 0, status: "PUBLISHED", isPublic: true, directorId: await memberIdOf(DIRECTOR) };
    const e = await call<Result<{ id: string }>>("POST", "/events", { token: admin, body });
    expect(e.body.ok, JSON.stringify(e.body)).toBe(true);
    const id = e.body.data.id;
    try {
      const t = await call<Result<{ id: string }>>("POST", `/events/${id}/teams`, { token: director, body: { name: "Plage", color: "#1E9BD7", leaderId: await memberIdOf(LEADER), memberIds: [] } });
      const k = await call<Result<{ memberId: string }>>("POST", `/events/${id}/kids`, { token: leader, body: { memberId: kid1, teamId: t.body.data.id } });
      expect(k.body.ok, JSON.stringify(k.body)).toBe(true);
      expect((await call<Result<unknown>>("POST", `/events/${id}/checkin`, { token: admin, body: { [`s_${kid1}`]: "PRESENT" } })).body.ok).toBe(true);
      const page = await call<Page>("GET", `/events/${id}/attendance`, { token: leader });
      expect(page.body).toMatchObject({ sessions: [dayFromToday(-2)], date: dayFromToday(-2) });
      expect(page.body.teams[0].statuses[kid1]).toMatchObject({ status: "PRESENT" });
      expect((await call("POST", `/events/${id}/attendance`, { token: leader, body: { date: dayFromToday(-2), teamId: t.body.data.id, entries: [{ memberId: kid1, status: "EXCUSED" }] } })).body).toMatchObject({ ok: true });
      expect(await db.attendance.findMany({ where: { contextKey: `event:${id}` }, select: { status: true } })).toEqual([{ status: "EXCUSED" }]);
      const checkin = await call<{ entries: { memberId: string; status: string }[] }>("GET", `/events/${id}/checkin`, { token: admin });
      expect(checkin.body.entries.find((x) => x.memberId === kid1)?.status).toBe("EXCUSED");
    } finally {
      await db.attendance.deleteMany({ where: { contextKey: `event:${id}` } });
      await db.event.delete({ where: { id } });
    }
  });
});

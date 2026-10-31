import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "net";
import type { Server } from "http";
import superjson from "superjson";
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
      "X-Forwarded-For": `10.77.${Math.floor(ipSeq / 250)}.${ipSeq % 250}`,
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
const memberIdOf = async (email: string) => (await db.member.findFirstOrThrow({ where: { user: { email } }, select: { id: true } })).id;
const userIdOf = async (email: string) => (await db.user.findUniqueOrThrow({ where: { email }, select: { id: true } })).id;

const ADMIN = "gestion@onet-teboulba.tn";
const DIRECTOR = "karim.jaziri@onet-teboulba.tn"; // monitor: no members.read_all, on no team of the test editions
const OTHER = "membre@onet-teboulba.tn"; // member, on no team of the test editions
const NEXT_DIRECTOR = "moniteur@onet-teboulba.tn";

let admin = "";
let director = "";
let other = "";
let karim = "";
let seriesId = "";
let directed = ""; // edition directed by Karim
let notDirected = ""; // edition of the same series without director
let teamId = "";
let kidId = "";
let kidReg = "";

const inFuture = (days: number) => new Date(Date.now() + days * 86400_000).toISOString().slice(0, 16);

beforeAll(async () => {
  [admin, director, other] = await Promise.all([login(ADMIN), login(DIRECTOR), login(OTHER)]);
  karim = await memberIdOf(DIRECTOR);
  const s = await call<Result<{ id: string }>>("POST", "/series", { token: admin, body: { name: "Director Festival", nameAr: "مهرجان المدير", kind: "FESTIVAL" } });
  seriesId = s.body.data.id;
});

describe("event director", () => {
  it("admins create an edition with a director; the director is notified with a link to it", async () => {
    const before = await db.notification.count({ where: { userId: await userIdOf(DIRECTOR) } });
    const b = await call<Result<{ id: string }>>("POST", `/series/${seriesId}/editions`, { token: admin, body: { startAt: inFuture(30), endAt: inFuture(40) } });
    expect(b.body.ok, JSON.stringify(b.body)).toBe(true);
    notDirected = b.body.data.id;
    const a = await call<Result<{ id: string }>>("POST", `/series/${seriesId}/editions`, { token: admin, body: { startAt: inFuture(60), endAt: inFuture(70), directorId: karim } });
    expect(a.body.ok, JSON.stringify(a.body)).toBe(true);
    directed = a.body.data.id;
    expect((await db.event.findUniqueOrThrow({ where: { id: directed } })).directorId).toBe(karim);
    expect((await db.event.findUniqueOrThrow({ where: { id: notDirected } })).directorId).toBeNull();
    expect(await db.notification.count({ where: { userId: await userIdOf(DIRECTOR) } })).toBe(before + 1);
    const note = await db.notification.findFirstOrThrow({ where: { userId: await userIdOf(DIRECTOR), link: `/dashboard/events/${directed}` } });
    expect(note).toMatchObject({ type: "EVENT_NEW", channel: "IN_APP" });
    expect(note.title).toContain("مهرجان المدير 2");
  });

  it("refuses directors who are not active animators, and non-admins can't pick one", async () => {
    const kid = await db.member.findFirstOrThrow({ where: { type: "CHILD" }, select: { id: true } });
    const suspended = await db.member.create({ data: { type: "MONITOR", firstName: "Sus", lastName: "Pendu", membershipNumber: "ONT-DIR-1", membershipStatus: "SUSPENDED" } });
    for (const directorId of [kid.id, suspended.id, "nope"]) {
      const r = await call<Result<unknown>>("POST", `/series/${seriesId}/editions`, { token: admin, body: { startAt: inFuture(90), endAt: inFuture(91), directorId } });
      expect(r.body).toMatchObject({ ok: false, error: "errors.directorIneligible" });
    }
    expect(await db.event.count({ where: { seriesId } })).toBe(2);
    // The candidates list is the team candidates pool, for admins only.
    const list = await call<{ candidates: { id: string }[] }>("GET", "/events/director-candidates", { token: admin });
    expect(list.body.candidates.map((c) => c.id)).toContain(karim);
    expect(list.body.candidates.map((c) => c.id)).not.toContain(suspended.id);
    expect((await call("GET", "/events/director-candidates", { token: director })).status).toBe(403);
    await db.member.delete({ where: { id: suspended.id } });
  });

  it("the director manages the teams of their edition (leader included), not those of another edition", async () => {
    const amel = await memberIdOf(OTHER);
    const r = await call<Result<{ id: string; conversationId: string }>>("POST", `/events/${directed}/teams`, { token: director, body: { name: "Les Phares", color: "#1E9BD7", leaderId: amel, memberIds: [] } });
    expect(r.body.ok, JSON.stringify(r.body)).toBe(true);
    teamId = r.body.data.id;
    // Change the leader (only admins and the director may); Amel leaves the team.
    const yasmine = await memberIdOf(NEXT_DIRECTOR);
    const u = await call<Result<unknown>>("POST", `/events/${directed}/teams`, { token: director, body: { id: teamId, name: "Les Phares", color: "#1E9BD7", leaderId: yasmine, memberIds: [] } });
    expect(u.body.ok, JSON.stringify(u.body)).toBe(true);
    expect(await db.eventTeam.findUniqueOrThrow({ where: { id: teamId } })).toMatchObject({ leaderId: yasmine });
    const page = await call<{ canManage: boolean; isDirector: boolean; candidates: unknown[] }>("GET", `/events/${directed}/teams`, { token: director });
    expect(page.body).toMatchObject({ canManage: true, isDirector: true });
    expect(page.body.candidates.length).toBeGreaterThan(0);
    // Not on the other edition.
    expect((await call("POST", `/events/${notDirected}/teams`, { token: director, body: { name: "Hack", color: "#000000", memberIds: [] } })).status).toBe(403);
    expect((await call<{ canManage: boolean }>("GET", `/events/${notDirected}/teams`, { token: director })).body.canManage).toBe(false);
    const foreign = await call<Result<{ id: string }>>("POST", `/events/${notDirected}/teams`, { token: admin, body: { name: "Autre", color: "#000000", memberIds: [] } });
    expect((await call("DELETE", `/events/teams/${foreign.body.data.id}`, { token: director })).status).toBe(403);
    // A member who isn't the director can't create teams there.
    expect((await call("POST", `/events/${directed}/teams`, { token: other, body: { name: "Hack", color: "#000000", memberIds: [] } })).status).toBe(403);
  });

  it("the director manages the kids of their edition, not those of another edition", async () => {
    const r = await call<Result<{ registrationId: string; memberId: string }>>("POST", `/events/${directed}/kids`, {
      token: director,
      body: { firstName: "Rayen", lastName: "Directi", dateOfBirth: "2016-05-06", parentName: "Sami Directi", parentPhone: "+216 22 444 555", teamId },
    });
    expect(r.body.ok, JSON.stringify(r.body)).toBe(true);
    kidId = r.body.data.memberId;
    kidReg = r.body.data.registrationId;
    const list = await call<{ rows: { registrationId: string; guardian: { phone: string } }[]; canManage: boolean }>("GET", `/events/${directed}/kids`, { token: director });
    expect(list.status).toBe(200);
    expect(list.body.canManage).toBe(true);
    expect(list.body.rows.find((x) => x.registrationId === kidReg)?.guardian.phone).toBe("+216 22 444 555");
    expect((await call("POST", `/events/${directed}/kids/${kidReg}/team`, { token: director, body: { teamId: null } })).body).toMatchObject({ ok: true, data: { teamId: null } });
    const card = await call<Result<unknown>>("POST", `/kids/${kidId}`, { token: director, body: { firstName: "Rayen", lastName: "Directi", dateOfBirth: "2016-05-06", parentName: "Sami Directi", parentPhone: "+216 22 444 666" } });
    expect(card.body.ok, JSON.stringify(card.body)).toBe(true);
    expect((await call("GET", `/members/${kidId}`, { token: director })).status).toBe(200);
    // Not the other edition, and not for a member who isn't the director.
    expect((await call("GET", `/events/${notDirected}/kids`, { token: director })).status).toBe(403);
    expect((await call("POST", `/events/${notDirected}/kids`, { token: director, body: { memberId: kidId } })).status).toBe(403);
    expect((await call("GET", `/events/${directed}/kids`, { token: other })).status).toBe(403);
    expect((await call("POST", `/events/${directed}/kids/${kidReg}/team`, { token: other, body: { teamId } })).status).toBe(403);
    expect((await call("POST", `/kids/${kidId}`, { token: other, body: { firstName: "X", lastName: "Y" } })).status).toBe(403);
  });

  it("the detail shows the director; the phone only to admins, the edition's teams and the director", async () => {
    const phone = (await db.member.findUniqueOrThrow({ where: { id: karim } })).phone;
    expect(phone).toBeTruthy();
    type Detail = { director: { id: string; name: string; phone: string | null } | null; isDirector: boolean; canManageTeams: boolean; canManageKids: boolean; manage: boolean };
    const mine = await call<Detail>("GET", `/events/${directed}`, { token: director });
    expect(mine.body).toMatchObject({ director: { id: karim, phone }, isDirector: true, canManageTeams: true, canManageKids: true, manage: false });
    expect((await call<Detail>("GET", `/events/${directed}`, { token: admin })).body.director?.phone).toBe(phone);
    const seen = await call<Detail>("GET", `/events/${directed}`, { token: other });
    expect(seen.body).toMatchObject({ director: { id: karim, phone: null }, isDirector: false, canManageTeams: false });
    expect((await call<Detail>("GET", `/events/${notDirected}`, { token: director })).body).toMatchObject({ director: null, isDirector: false, canManageTeams: false });
    // The director can't edit or delete the event itself.
    expect((await call("GET", `/events/${directed}/form`, { token: director })).status).toBe(403);
    expect((await call("DELETE", `/events/${directed}`, { token: director })).status).toBe(403);
  });

  it("the member home lists the events the user directs", async () => {
    const home = await call<{ kind: string; data: { directed: { id: string; teams: number; kids: number }[] } }>("GET", "/dashboard", { token: director });
    expect(home.body.kind).toBe("member");
    expect(home.body.data.directed.find((e) => e.id === directed)).toMatchObject({ teams: 1, kids: 1 });
  });

  it("the next edition proposes the previous director; editing the event changes the director and notifies the new one", async () => {
    const page = await call<{ next: { directorId: string | null } }>("GET", `/series/${seriesId}`, { token: admin });
    expect(page.body.next.directorId).toBe(karim);
    const form = await call<Record<string, unknown>>("GET", `/events/${directed}/form`, { token: admin });
    expect(form.body).toMatchObject({ directorId: karim, director: { id: karim } });
    const e = await db.event.findUniqueOrThrow({ where: { id: directed } });
    const body = { id: e.id, title: e.title, category: e.category, startAt: e.startAt, endAt: e.endAt, capacity: e.capacity, price: 0, status: e.status, isPublic: true };
    // Absent → unchanged.
    expect((await call<Result<unknown>>("POST", "/events", { token: admin, body })).body.ok).toBe(true);
    expect((await db.event.findUniqueOrThrow({ where: { id: directed } })).directorId).toBe(karim);
    const yasmine = await memberIdOf(NEXT_DIRECTOR);
    const yasmineUser = await userIdOf(NEXT_DIRECTOR);
    const before = await db.notification.count({ where: { userId: yasmineUser, link: `/dashboard/events/${directed}` } });
    const r = await call<Result<unknown>>("POST", "/events", { token: admin, body: { ...body, directorId: yasmine } });
    expect(r.body.ok, JSON.stringify(r.body)).toBe(true);
    expect((await db.event.findUniqueOrThrow({ where: { id: directed } })).directorId).toBe(yasmine);
    expect(await db.notification.count({ where: { userId: yasmineUser, link: `/dashboard/events/${directed}` } })).toBe(before + 1);
    // Karim lost the rights with the role.
    expect((await call("POST", `/events/${directed}/teams`, { token: director, body: { name: "Plus", color: "#000000", memberIds: [] } })).status).toBe(403);
    expect((await call("GET", `/events/${directed}/kids`, { token: director })).status).toBe(403);
    // Blank → no director; an ineligible one is refused.
    expect((await call<Result<unknown>>("POST", "/events", { token: admin, body: { ...body, directorId: kidId } })).body).toMatchObject({ ok: false, error: "errors.directorIneligible" });
    expect((await call<Result<unknown>>("POST", "/events", { token: admin, body: { ...body, directorId: "" } })).body.ok).toBe(true);
    expect((await db.event.findUniqueOrThrow({ where: { id: directed } })).directorId).toBeNull();
    // A one-off internal event (no series): hidden from a plain member until they become its director.
    const oneOffBody = { title: "Soirée du directeur", category: "CULTURAL", startAt: inFuture(20), endAt: inFuture(21), capacity: 50, price: 0, status: "PUBLISHED", isPublic: false };
    const oneOff = await call<Result<{ id: string }>>("POST", "/events", { token: admin, body: oneOffBody });
    expect(oneOff.body.ok, JSON.stringify(oneOff.body)).toBe(true);
    const oneOffId = oneOff.body.data.id;
    expect((await call("GET", `/events/${oneOffId}`, { token: other })).status).toBe(404);
    expect((await call<Result<unknown>>("POST", "/events", { token: admin, body: { ...oneOffBody, id: oneOffId, directorId: await memberIdOf(OTHER) } })).body.ok).toBe(true);
    const seen = await call<{ isDirector: boolean; director: { phone: string | null } }>("GET", `/events/${oneOffId}`, { token: other });
    expect(seen.status).toBe(200);
    expect(seen.body.isDirector).toBe(true);
  });

  it("a suspended director loses the rights; deleting the member clears the director (SET NULL)", async () => {
    await call("POST", "/events", {
      token: admin,
      body: { ...(await eventBody(directed)), directorId: karim },
    });
    expect((await call("GET", `/events/${directed}/kids`, { token: director })).status).toBe(200);
    await db.member.update({ where: { id: karim }, data: { membershipStatus: "SUSPENDED" } });
    try {
      expect((await call("GET", `/events/${directed}/kids`, { token: director })).status).toBe(403);
      expect((await call("POST", `/events/${directed}/teams`, { token: director, body: { name: "Plus", color: "#000000", memberIds: [] } })).status).toBe(403);
    } finally {
      await db.member.update({ where: { id: karim }, data: { membershipStatus: "ACTIVE" } });
    }
    const temp = await db.member.create({ data: { type: "STAFF", firstName: "Temp", lastName: "Directeur", membershipNumber: "ONT-DIR-2" } });
    expect((await call<Result<unknown>>("POST", "/events", { token: admin, body: { ...(await eventBody(notDirected)), directorId: temp.id } })).body.ok).toBe(true);
    expect((await db.event.findUniqueOrThrow({ where: { id: notDirected } })).directorId).toBe(temp.id);
    await db.member.delete({ where: { id: temp.id } });
    expect(await db.event.findUniqueOrThrow({ where: { id: notDirected } })).toMatchObject({ directorId: null });
  });
});

async function eventBody(id: string) {
  const e = await db.event.findUniqueOrThrow({ where: { id } });
  return { id: e.id, title: e.title, category: e.category, startAt: e.startAt, endAt: e.endAt, capacity: e.capacity, price: e.price, status: e.status, isPublic: e.isPublic };
}

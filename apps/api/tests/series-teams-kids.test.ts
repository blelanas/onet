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
      "X-Forwarded-For": `10.88.${Math.floor(ipSeq / 250)}.${ipSeq % 250}`,
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
const participants = async (conversationId: string) =>
  (await db.conversationParticipant.findMany({ where: { conversationId }, select: { userId: true, isAdmin: true } })).sort((a, b) => a.userId.localeCompare(b.userId));

const ADMIN = "gestion@onet-teboulba.tn";
const LEADER = "membre@onet-teboulba.tn"; // member role, leads a team of the test edition
const TEAMMATE = "moniteur@onet-teboulba.tn";
const OUTSIDER = "karim.jaziri@onet-teboulba.tn"; // monitor, on no team of the test editions

let admin = "";
let leader = "";
let outsider = "";
let seriesId = "";
let edition1 = "";
let edition2 = "";
let teamId = "";
let conversationId = "";
let wassimId = "";
let newKidId = "";
let newKidReg = "";

beforeAll(async () => {
  [admin, leader, outsider] = await Promise.all([login(ADMIN), login(LEADER), login(OUTSIDER)]);
  wassimId = (await db.member.findFirstOrThrow({ where: { email: "wassim.hamdi@onet-teboulba.tn" }, select: { id: true } })).id;
});

describe("series & editions", () => {
  it("only admins create series; editions are numbered max + 1 with a default title", async () => {
    expect((await call("POST", "/series", { token: leader, body: { name: "Nope", kind: "CLUB" } })).status).toBe(403);
    const s = await call<Result<{ id: string }>>("POST", "/series", { token: admin, body: { name: "Test Festival", nameAr: "مهرجان التجربة", kind: "FESTIVAL", color: "#12924A" } });
    expect(s.body.ok, JSON.stringify(s.body)).toBe(true);
    seriesId = s.body.data.id;

    const e1 = await call<Result<{ id: string; editionNumber: number; title: string }>>("POST", `/series/${seriesId}/editions`, {
      token: admin,
      body: { seasonYear: 2025, startAt: "2025-07-10T09:00", endAt: "2025-07-20T18:00", location: "Teboulba" },
    });
    expect(e1.body).toMatchObject({ ok: true, data: { editionNumber: 1, title: "مهرجان التجربة 1" } });
    edition1 = e1.body.data.id;
    const ev = await db.event.findUniqueOrThrow({ where: { id: edition1 } });
    expect(ev).toMatchObject({ seriesId, editionNumber: 1, seasonYear: 2025, category: "CHILDREN", status: "PUBLISHED", isPublic: true });

    // A club season gets "<name> <year>-<year+1>".
    const club = await call<Result<{ id: string }>>("POST", "/series", { token: admin, body: { name: "Test Club", kind: "CLUB" } });
    const season = await call<Result<{ title: string; editionNumber: number }>>("POST", `/series/${club.body.data.id}/editions`, {
      token: admin,
      body: { seasonYear: 2026, startAt: "2026-10-01T09:00", endAt: "2027-06-30T18:00" },
    });
    expect(season.body).toMatchObject({ ok: true, data: { title: "Test Club 2026-2027", editionNumber: 1 } });
    // Deleting a series with editions is refused; an empty one can go.
    const emptySeries = await call<Result<{ id: string }>>("POST", "/series", { token: admin, body: { name: "Empty", kind: "OTHER" } });
    expect((await call("DELETE", `/series/${club.body.data.id}`, { token: admin })).body).toMatchObject({ ok: false, error: "errors.inUse" });
    expect((await call("DELETE", `/series/${emptySeries.body.data.id}`, { token: admin })).body).toMatchObject({ ok: true });
  });

  it("lists series as cards and the editions of a series grouped by year", async () => {
    const list = await call<{ series: { id: string; editionsCount: number; latestEdition: { id: string } | null }[]; otherCount: number }>("GET", "/series", { token: leader });
    expect(list.status).toBe(200);
    expect(list.body.series.find((s) => s.id === seriesId)).toMatchObject({ editionsCount: 1, latestEdition: { id: edition1 } });
    expect(list.body.otherCount).toBeGreaterThan(0);
    const others = await call<{ rows: { id: string }[] }>("GET", "/events?series=none&tab=past", { token: admin });
    expect(others.body.rows.some((r) => r.id === edition1)).toBe(false);
  });
});

describe("teams and their group chat", () => {
  it("saving a team creates its GROUP conversation with the leader (admin) and members with a login", async () => {
    const [amel, yasmine] = await Promise.all([memberIdOf(LEADER), memberIdOf(TEAMMATE)]);
    const r = await call<Result<{ id: string; conversationId: string }>>("POST", `/events/${edition1}/teams`, {
      token: admin,
      body: { name: "Les Étoiles", color: "#FFB400", leaderId: amel, memberIds: [yasmine, wassimId] },
    });
    expect(r.body.ok, JSON.stringify(r.body)).toBe(true);
    teamId = r.body.data.id;
    conversationId = r.body.data.conversationId;
    const conv = await db.conversation.findUniqueOrThrow({ where: { id: conversationId } });
    expect(conv).toMatchObject({ kind: "GROUP", subject: "مهرجان التجربة 1 · Les Étoiles", createdById: await userIdOf(ADMIN) });
    // Wassim has no login: not a participant.
    expect(await participants(conversationId)).toEqual(
      [
        { userId: await userIdOf(LEADER), isAdmin: true },
        { userId: await userIdOf(TEAMMATE), isAdmin: false },
      ].sort((a, b) => a.userId.localeCompare(b.userId)),
    );
    const teams = await call<{ teams: { id: string; leader: { id: string }; members: { id: string }[]; conversationId: string }[] }>("GET", `/events/${edition1}/teams`, { token: outsider });
    expect(teams.status).toBe(200);
    expect(teams.body.teams[0]).toMatchObject({ id: teamId, leader: { id: amel }, conversationId });
    expect(teams.body.teams[0].members.map((m) => m.id).sort()).toEqual([yasmine, wassimId].sort());
  });

  it("animators' phone numbers are only shown to admins and to the edition's teams", async () => {
    type Teams = { teams: { leader: { phone: string | null } | null; members: { id: string; phone: string | null }[] }[] };
    const amelPhone = (await db.member.findUniqueOrThrow({ where: { id: await memberIdOf(LEADER) } })).phone;
    const wassimPhone = (await db.member.findUniqueOrThrow({ where: { id: wassimId } })).phone;
    expect(amelPhone && wassimPhone).toBeTruthy();
    // On no team of the edition (and not an admin): names only.
    const seen = await call<Teams>("GET", `/events/${edition1}/teams`, { token: outsider });
    expect(seen.status).toBe(200);
    expect(seen.body.teams[0].leader).toMatchObject({ phone: null });
    expect(seen.body.teams[0].members.map((m) => m.phone)).toEqual([null, null]);
    const detail = await call<{ teams: { leader: { phone: string | null } | null }[] }>("GET", `/events/${edition1}`, { token: outsider });
    expect(detail.body.teams[0].leader).toMatchObject({ phone: null });
    // The team itself and admins see them.
    for (const token of [leader, admin]) {
      const r = await call<Teams>("GET", `/events/${edition1}/teams`, { token });
      expect(r.body.teams[0].leader?.phone).toBe(amelPhone);
      expect(r.body.teams[0].members.find((m) => m.id === wassimId)?.phone).toBe(wassimPhone);
      expect((await call<{ teams: { leader: { phone: string | null } | null }[] }>("GET", `/events/${edition1}`, { token })).body.teams[0].leader?.phone).toBe(amelPhone);
    }
  });

  it("removing a member removes them from the chat; renaming renames it; a non-leader can't edit", async () => {
    const amel = await memberIdOf(LEADER);
    expect((await call("POST", `/events/${edition1}/teams`, { token: outsider, body: { id: teamId, name: "Hack", color: "#000000", memberIds: [] } })).status).toBe(403);
    // Yasmine has an unread message notification from the team chat.
    const link = `/dashboard/messages?c=${conversationId}`;
    const yasmineUser = await userIdOf(TEAMMATE);
    await db.notification.create({ data: { userId: yasmineUser, type: "MESSAGE", title: "Amel · Les Étoiles", body: "Salut", link } });
    // The team's own leader may change the members and the name, not the leader.
    const r = await call<Result<{ conversationId: string }>>("POST", `/events/${edition1}/teams`, {
      token: leader,
      body: { id: teamId, name: "Les Comètes", color: "#FFB400", leaderId: await memberIdOf(OUTSIDER), memberIds: [wassimId] },
    });
    expect(r.body.ok, JSON.stringify(r.body)).toBe(true);
    expect(r.body.data.conversationId).toBe(conversationId);
    expect(await db.eventTeam.findUniqueOrThrow({ where: { id: teamId } })).toMatchObject({ leaderId: amel, name: "Les Comètes" });
    expect(await participants(conversationId)).toEqual([{ userId: await userIdOf(LEADER), isAdmin: true }]);
    // Removed from the chat: no unread notification left pointing at it.
    expect(await db.notification.count({ where: { userId: yasmineUser, type: "MESSAGE", readAt: null, link } })).toBe(0);
    expect((await db.conversation.findUniqueOrThrow({ where: { id: conversationId } })).subject).toBe("مهرجان التجربة 1 · Les Comètes");
    // Only admins create teams.
    expect((await call("POST", `/events/${edition1}/teams`, { token: leader, body: { name: "Other", color: "#123456" } })).status).toBe(403);
    // Candidates must be animators (MEMBER / MONITOR / STAFF), never kids.
    const kid = await db.member.findFirstOrThrow({ where: { type: "CHILD" } });
    expect((await call("POST", `/events/${edition1}/teams`, { token: admin, body: { id: teamId, name: "X", color: "#123456", leaderId: amel, memberIds: [kid.id] } })).body).toMatchObject({ ok: false, error: "errors.validation" });
  });

  it("deleting a team deletes its conversation", async () => {
    const t = await call<Result<{ id: string; conversationId: string }>>("POST", `/events/${edition1}/teams`, { token: admin, body: { name: "Temp", color: "#1E9BD7", leaderId: await memberIdOf(TEAMMATE) } });
    expect(await db.conversation.count({ where: { id: t.body.data.conversationId } })).toBe(1);
    expect((await call("DELETE", `/events/teams/${t.body.data.id}`, { token: leader })).status).toBe(403);
    expect((await call("DELETE", `/events/teams/${t.body.data.id}`, { token: admin })).body).toMatchObject({ ok: true });
    expect(await db.conversation.count({ where: { id: t.body.data.conversationId } })).toBe(0);
    expect(await db.eventTeam.count({ where: { id: t.body.data.id } })).toBe(0);
  });
});

describe("kids of an edition", () => {
  it("a leader adds a new kid: CHILD + PARENT contact without login + primary guardianship + confirmed registration", async () => {
    const r = await call<Result<{ registrationId: string; memberId: string }>>("POST", `/events/${edition1}/kids`, {
      token: leader,
      body: { firstName: "Nour", lastName: "Testi", dateOfBirth: "2017-03-04", gender: "F", parentName: "Hichem Testi", parentPhone: "+216 22 333 444", parentRelation: "FATHER", teamId },
    });
    expect(r.body.ok, JSON.stringify(r.body)).toBe(true);
    newKidId = r.body.data.memberId;
    newKidReg = r.body.data.registrationId;
    const kid = await db.member.findUniqueOrThrow({ where: { id: newKidId }, include: { parentLinks: { include: { parent: true } } } });
    expect(kid).toMatchObject({ type: "CHILD", firstName: "Nour", lastName: "Testi", userId: null });
    expect(kid.membershipNumber).toMatch(/^ONT-\d{4,}$/);
    expect(kid.parentLinks).toHaveLength(1);
    expect(kid.parentLinks[0]).toMatchObject({ relation: "FATHER", isPrimary: true, parent: { type: "PARENT", firstName: "Hichem", lastName: "Testi", phone: "+216 22 333 444", userId: null } });
    expect(await db.eventRegistration.findUniqueOrThrow({ where: { id: newKidReg } })).toMatchObject({ eventId: edition1, memberId: newKidId, status: "CONFIRMED", teamId, invoiceId: null });
  });

  it("adds an existing kid, and refuses duplicates", async () => {
    const existing = await db.member.findFirstOrThrow({ where: { type: "CHILD", parentLinks: { some: { parent: { email: "mohamed.gharbi0@example.tn" } } } }, orderBy: { membershipNumber: "asc" } });
    const r = await call<Result<{ registrationId: string }>>("POST", `/events/${edition1}/kids`, { token: leader, body: { memberId: existing.id } });
    expect(r.body.ok, JSON.stringify(r.body)).toBe(true);
    expect((await call("POST", `/events/${edition1}/kids`, { token: leader, body: { memberId: existing.id } })).body).toMatchObject({ ok: false, error: "errors.alreadyRegistered" });
    // The same new kid typed twice: already in the edition → alreadyRegistered.
    const again = { firstName: "Nour", lastName: "Testi", dateOfBirth: "2017-03-04", parentName: "Hichem Testi", parentPhone: "+216 22 333 444" };
    expect((await call("POST", `/events/${edition1}/kids`, { token: leader, body: again })).body).toMatchObject({ ok: false, error: "errors.alreadyRegistered" });
    // Missing parent contact for a new kid → field errors.
    const missing = await call<{ ok: boolean; fieldErrors: Record<string, string> }>("POST", `/events/${edition1}/kids`, { token: leader, body: { firstName: "A", lastName: "B" } });
    expect(missing.body.ok).toBe(false);
    expect(Object.keys(missing.body.fieldErrors)).toEqual(expect.arrayContaining(["dateOfBirth", "parentName", "parentPhone"]));
  });

  it("needs a real parent phone, never creates the same kid twice, and drops a cancelled invoice when a kid comes back", async () => {
    const kid = { firstName: "Sami", lastName: "Doublon", dateOfBirth: "2016-05-06", parentName: "Rim Doublon" };
    for (const parentPhone of ["------", "call 22 345 678", "1234"]) {
      const bad = await call<{ ok: boolean; fieldErrors: Record<string, string> }>("POST", `/events/${edition1}/kids`, { token: leader, body: { ...kid, parentPhone } });
      expect(bad.body.fieldErrors?.parentPhone, parentPhone).toBe("errors.phone");
    }
    // The same new kid sent twice at once: one is created, the other is told it's already there.
    const both = await Promise.all([1, 2].map(() => call<Result<{ memberId: string; registrationId: string }>>("POST", `/events/${edition1}/kids`, { token: leader, body: { ...kid, parentPhone: "+216 22 444 555" } })));
    expect(both.filter((r) => r.body.ok)).toHaveLength(1);
    expect(both.find((r) => !r.body.ok)?.body.error).toBe("errors.alreadyRegistered");
    const sami = await db.member.findFirstOrThrow({ where: { type: "CHILD", firstName: "Sami", lastName: "Doublon" }, include: { parentLinks: true } });
    expect(await db.member.count({ where: { type: "CHILD", firstName: "Sami", lastName: "Doublon" } })).toBe(1);
    // A cancelled registration whose unpaid invoice was cancelled: re-adding the kid restores it without that invoice.
    const reg = await db.eventRegistration.findFirstOrThrow({ where: { eventId: edition1, memberId: sami.id } });
    const inv = await db.invoice.create({ data: { number: `TEST-KID-${Date.now()}`, description: "Test", amount: 5000, dueDate: new Date(), status: "CANCELLED", payerId: sami.id, childId: sami.id, eventId: edition1 } });
    await db.eventRegistration.update({ where: { id: reg.id }, data: { status: "CANCELLED", invoiceId: inv.id } });
    expect((await call("POST", `/events/${edition1}/kids`, { token: leader, body: { memberId: sami.id } })).body).toMatchObject({ ok: true });
    expect(await db.eventRegistration.findUniqueOrThrow({ where: { id: reg.id } })).toMatchObject({ status: "CONFIRMED", invoiceId: null });
    // Clean up (the edition's kid counts are checked further down).
    await db.eventRegistration.delete({ where: { id: reg.id } });
    await db.invoice.delete({ where: { id: inv.id } });
    await db.member.delete({ where: { id: sami.id } });
    await db.member.deleteMany({ where: { id: { in: sami.parentLinks.map((l) => l.parentId) } } });
  });

  it("assigns kids to teams; the kids list filters by team and shows the parent contact", async () => {
    expect((await call("POST", `/events/${edition1}/kids/${newKidReg}/team`, { token: leader, body: { teamId: null } })).body).toMatchObject({ ok: true, data: { teamId: null } });
    const none = await call<{ rows: { registrationId: string }[] }>("GET", `/events/${edition1}/kids?teamId=none`, { token: leader });
    expect(none.body.rows.map((r) => r.registrationId)).toContain(newKidReg);
    expect((await call("POST", `/events/${edition1}/kids/${newKidReg}/team`, { token: leader, body: { teamId } })).body).toMatchObject({ ok: true, data: { teamId } });
    const list = await call<{ rows: { registrationId: string; member: { age: number }; team: { id: string } | null; guardian: { name: string; phone: string; relation: string } }[]; canManage: boolean }>(
      "GET",
      `/events/${edition1}/kids?teamId=${teamId}&q=Nour`,
      { token: leader },
    );
    expect(list.body.canManage).toBe(true);
    expect(list.body.rows).toHaveLength(1);
    expect(list.body.rows[0]).toMatchObject({ registrationId: newKidReg, team: { id: teamId }, guardian: { name: "Hichem Testi", phone: "+216 22 333 444", relation: "FATHER" } });
    expect(list.body.rows[0].member.age).toBeGreaterThanOrEqual(8);
    // A team of another edition is refused.
    const other = await db.eventTeam.findFirstOrThrow({ where: { eventId: { not: edition1 } } });
    expect((await call("POST", `/events/${edition1}/kids/${newKidReg}/team`, { token: leader, body: { teamId: other.id } })).body).toMatchObject({ ok: false, error: "errors.validation" });
  });

  it("a member on no team of the edition gets 403 on its kids; a teammate reads them but can't manage them", async () => {
    expect((await call("GET", `/events/${edition1}/kids`, { token: outsider })).status).toBe(403);
    expect((await call("GET", `/events/${edition1}/kids/export.csv`, { token: outsider })).status).toBe(403);
    expect((await call("POST", `/events/${edition1}/kids`, { token: outsider, body: { memberId: newKidId } })).status).toBe(403);
    expect((await call("DELETE", `/events/${edition1}/kids/${newKidReg}`, { token: outsider })).status).toBe(403);
    // The kid's profile follows the same scope.
    expect((await call("GET", `/members/${newKidId}`, { token: leader })).status).toBe(200);
    expect((await call("GET", `/members/${newKidId}`, { token: outsider })).status).toBe(403);
    // Wassim-like teammates: put the outsider on the team as a member → read-only access.
    await call("POST", `/events/${edition1}/teams`, { token: admin, body: { id: teamId, name: "Les Comètes", color: "#FFB400", leaderId: await memberIdOf(LEADER), memberIds: [wassimId, await memberIdOf(OUTSIDER)] } });
    const read = await call<{ rows: unknown[]; canManage: boolean }>("GET", `/events/${edition1}/kids`, { token: outsider });
    expect(read.status).toBe(200);
    expect(read.body.canManage).toBe(false);
    expect((await call("POST", `/events/${edition1}/kids/${newKidReg}/team`, { token: outsider, body: { teamId: null } })).status).toBe(403);
    // Back to the original team.
    await call("POST", `/events/${edition1}/teams`, { token: admin, body: { id: teamId, name: "Les Comètes", color: "#FFB400", leaderId: await memberIdOf(LEADER), memberIds: [wassimId] } });
  });

  it("an edition's leader updates the kid card, including the parent contact", async () => {
    const r = await call<Result<{ id: string }>>("POST", `/kids/${newKidId}`, {
      token: leader,
      body: { firstName: "Nour", lastName: "Testi", dateOfBirth: "2017-03-04", parentName: "Hichem Testi", parentPhone: "+216 22 999 000", parentRelation: "GUARDIAN" },
    });
    expect(r.body.ok, JSON.stringify(r.body)).toBe(true);
    const link = await db.guardianship.findFirstOrThrow({ where: { childId: newKidId }, include: { parent: true } });
    expect(link).toMatchObject({ relation: "GUARDIAN", parent: { phone: "+216 22 999 000" } });
    expect((await call("POST", `/kids/${newKidId}`, { token: outsider, body: { firstName: "X", lastName: "Y" } })).status).toBe(403);
  });
});

describe("editions history, copy of teams, global kids list", () => {
  it("a new edition can copy the previous edition's teams (not the kids) with fresh chats", async () => {
    const e2 = await call<Result<{ id: string; editionNumber: number; copiedTeams: number }>>("POST", `/series/${seriesId}/editions`, {
      token: admin,
      body: { seasonYear: 2026, startAt: "2026-07-10T09:00", endAt: "2026-07-20T18:00", copyTeams: "on" },
    });
    expect(e2.body).toMatchObject({ ok: true, data: { editionNumber: 2, copiedTeams: 1 } });
    edition2 = e2.body.data.id;
    const teams = await db.eventTeam.findMany({ where: { eventId: edition2 }, include: { members: true, conversation: true } });
    expect(teams).toHaveLength(1);
    expect(teams[0]).toMatchObject({ name: "Les Comètes", leaderId: await memberIdOf(LEADER) });
    expect(teams[0].members.map((m) => m.memberId)).toEqual([wassimId]);
    expect(teams[0].conversationId).not.toBe(conversationId);
    expect(teams[0].conversation).toMatchObject({ kind: "GROUP", subject: "مهرجان التجربة 2 · Les Comètes" });
    expect(await db.eventRegistration.count({ where: { eventId: edition2 } })).toBe(0);
    // A taken edition number is refused.
    expect((await call("POST", `/series/${seriesId}/editions`, { token: admin, body: { editionNumber: 2, startAt: "2027-07-10T09:00", endAt: "2027-07-20T18:00" } })).body).toMatchObject({
      ok: false,
      error: "errors.inUse",
    });
  });

  it("edition numbers are unique per series (database index); blank series fields are cleared", async () => {
    // Database level: a second number 2 in the series is refused; events outside a series aren't concerned.
    await expect(db.event.create({ data: { title: "Doublon", category: "CHILDREN", startAt: new Date(), endAt: new Date(), seriesId, editionNumber: 2 } })).rejects.toThrow();
    const base = { title: "مهرجان التجربة 2", category: "CHILDREN", startAt: "2026-07-10T09:00", endAt: "2026-07-20T18:00", organizer: "ONET Teboulba", capacity: 100, price: 0, status: "PUBLISHED", isPublic: "on", id: edition2 };
    expect((await call("POST", "/events", { token: admin, body: { ...base, editionNumber: 1 } })).body).toMatchObject({ ok: false, error: "errors.inUse" });
    // Submitted blank → cleared; absent → kept.
    expect((await call("POST", "/events", { token: admin, body: { ...base, editionNumber: "", seasonYear: "" } })).body).toMatchObject({ ok: true });
    expect(await db.event.findUniqueOrThrow({ where: { id: edition2 } })).toMatchObject({ editionNumber: null, seasonYear: null });
    expect((await call("POST", "/events", { token: admin, body: { ...base, editionNumber: 2, seasonYear: 2026 } })).body).toMatchObject({ ok: true });
    expect((await call("POST", "/events", { token: admin, body: base })).body).toMatchObject({ ok: true });
    expect(await db.event.findUniqueOrThrow({ where: { id: edition2 } })).toMatchObject({ editionNumber: 2, seasonYear: 2026 });
    // Concurrent creations never give two editions the same number (the loser gets errors.inUse).
    const created = await Promise.all([1, 2, 3].map(() => call<Result<{ id: string }>>("POST", `/series/${seriesId}/editions`, { token: admin, body: { startAt: "2028-07-10T09:00", endAt: "2028-07-20T18:00" } })));
    for (const r of created) if (!r.body.ok) expect(r.body.error).toBe("errors.inUse");
    const numbers = (await db.event.findMany({ where: { seriesId }, select: { editionNumber: true } })).map((e) => e.editionNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
    await db.event.deleteMany({ where: { id: { in: created.filter((r) => r.body.ok).map((r) => r.body.data.id) } } });
  });

  it("kid history is grouped by season year, newest first, with team and series", async () => {
    // Typing an existing kid again as a "new kid" is refused: the existing record must be used.
    const retyped = { firstName: "Nour", lastName: "Testi", dateOfBirth: "2017-03-04", parentName: "Hichem Testi", parentPhone: "+216 22 333 444" };
    expect((await call("POST", `/events/${edition2}/kids`, { token: leader, body: retyped })).body).toMatchObject({ ok: false, error: "errors.kidExists" });
    expect((await call("POST", `/events/${edition2}/kids`, { token: leader, body: { memberId: newKidId } })).body).toMatchObject({ ok: true });
    const h = await call<{ years: { year: number; editions: { event: { id: string; series: { id: string } }; team: { id: string } | null }[] }[] }>("GET", `/kids/${newKidId}/history`, { token: leader });
    expect(h.status).toBe(200);
    expect(h.body.years.map((y) => y.year)).toEqual([2026, 2025]);
    expect(h.body.years[0].editions[0]).toMatchObject({ event: { id: edition2, series: { id: seriesId } }, team: null });
    expect(h.body.years[1].editions[0]).toMatchObject({ event: { id: edition1 }, team: { id: teamId } });
    expect((await call("GET", `/kids/${newKidId}/history`, { token: outsider })).status).toBe(403);
  });

  it("a kid seen only through a team: identity, guardian contact and those editions, nothing from other contexts", async () => {
    const DAY = 86400_000;
    const trip = await db.trip.create({ data: { title: "Sortie hors équipe", destination: "Monastir", category: "EXCURSION", departureLocation: "Teboulba", departAt: new Date(Date.now() + 10 * DAY), returnAt: new Date(Date.now() + 10 * DAY + 3600_000) } });
    const other = await db.event.create({ data: { title: "Fête hors équipe", category: "CHILDREN", startAt: new Date(Date.now() + 5 * DAY), endAt: new Date(Date.now() + 5 * DAY + 3600_000) } });
    await db.tripRegistration.create({ data: { tripId: trip.id, memberId: newKidId, status: "CONFIRMED" } });
    await db.eventRegistration.create({ data: { eventId: other.id, memberId: newKidId, status: "CONFIRMED" } });
    await db.attendance.create({ data: { memberId: newKidId, date: new Date(), status: "PRESENT", contextKey: `trip:${trip.id}`, tripId: trip.id } });
    type Profile = {
      teamView: boolean;
      attendance: unknown[];
      invoices: unknown[] | null;
      member: { phone: string | null; group: unknown; parentLinks: { parent: { phone: string | null } }[]; eventRegistrations: { eventId: string }[]; tripRegistrations: unknown[] };
    };
    type History = { teamView: boolean; years: { editions: { event: { id: string } }[]; trips: { trip: { id: string } }[] }[] };
    try {
      const p = await call<Profile>("GET", `/members/${newKidId}`, { token: leader });
      expect(p.status).toBe(200);
      expect(p.body).toMatchObject({ teamView: true, attendance: [], invoices: null, member: { tripRegistrations: [], group: null } });
      expect(p.body.member.eventRegistrations.map((r) => r.eventId).sort()).toEqual([edition1, edition2].sort());
      expect(p.body.member.parentLinks[0]?.parent.phone).toBe("+216 22 999 000");
      const h = await call<History>("GET", `/kids/${newKidId}/history`, { token: leader });
      expect(h.body.teamView).toBe(true);
      expect(h.body.years.flatMap((y) => y.editions.map((e) => e.event.id)).sort()).toEqual([edition1, edition2].sort());
      expect(h.body.years.flatMap((y) => y.trips)).toEqual([]);
      // Admins see the whole profile and history.
      const full = await call<Profile>("GET", `/members/${newKidId}`, { token: admin });
      expect(full.body.teamView).toBe(false);
      expect(full.body.member.tripRegistrations).toHaveLength(1);
      expect(full.body.member.eventRegistrations.map((r) => r.eventId)).toContain(other.id);
      const fh = await call<History>("GET", `/kids/${newKidId}/history`, { token: admin });
      expect(fh.body.teamView).toBe(false);
      expect(fh.body.years.flatMap((y) => y.trips.map((t) => t.trip.id))).toEqual([trip.id]);
      expect(fh.body.years.flatMap((y) => y.editions.map((e) => e.event.id))).toContain(other.id);
    } finally {
      await db.attendance.deleteMany({ where: { memberId: newKidId, tripId: trip.id } });
      await db.tripRegistration.deleteMany({ where: { tripId: trip.id } });
      await db.eventRegistration.deleteMany({ where: { eventId: other.id } });
      await db.trip.delete({ where: { id: trip.id } });
      await db.event.delete({ where: { id: other.id } });
    }
  });

  it("the global kids list is scoped to the user's editions; admins see everyone", async () => {
    type Kids = { rows: { member: { id: string }; editionsCount: number; latestEdition: { id: string } | null }[]; total: number };
    const mine = await call<Kids>("GET", `/kids?q=Testi`, { token: leader });
    expect(mine.status).toBe(200);
    expect(mine.body.rows.map((r) => r.member.id)).toEqual([newKidId]);
    expect(mine.body.rows[0]).toMatchObject({ editionsCount: 2, latestEdition: { id: edition2 } });
    expect((await call<Kids>("GET", `/kids?q=Testi`, { token: outsider })).body.rows).toHaveLength(0);
    const filtered = await call<Kids>("GET", `/kids?eventId=${edition1}`, { token: admin });
    expect(filtered.body.total).toBe(2);
    expect((await call<Kids>("GET", `/kids?seriesId=${seriesId}&year=2026`, { token: admin })).body.rows.map((r) => r.member.id)).toEqual([newKidId]);
    const all = await call<Kids>("GET", "/kids", { token: admin });
    expect(all.body.total).toBe(await db.member.count({ where: { type: "CHILD" } }));
    // The outsider only sees kids of the seeded editions they are on.
    const scoped = await call<Kids>("GET", "/kids", { token: outsider });
    expect(scoped.body.total).toBeLessThan(all.body.total);
    const csv = await fetch(`${base}/kids/export.csv?eventId=${edition1}`, { headers: { Authorization: `Bearer ${admin}`, "X-Forwarded-For": "10.89.0.1" } });
    expect(csv.status).toBe(200);
    expect(await csv.text()).toContain("Testi");
  });

  it("leaders searching kids to add get names and age only; the directory's filters hide drafts and inactive series", async () => {
    type Cands = { rows: { id: string; age: number | null; photoUrl: string | null; dateOfBirth: unknown; gender: string | null; guardianName: string | null; lastEdition: unknown; membershipNumber: string | null }[] };
    const mine = await call<Cands>("GET", `/events/${edition1}/kids/candidates?q=an`, { token: leader });
    expect(mine.status).toBe(200);
    expect(mine.body.rows.length).toBeGreaterThan(0);
    for (const k of mine.body.rows) expect(k).toMatchObject({ photoUrl: null, dateOfBirth: null, gender: null, guardianName: null, lastEdition: null, membershipNumber: null, age: expect.any(Number) });
    const all = await call<Cands>("GET", `/events/${edition1}/kids/candidates?q=an`, { token: admin });
    expect(all.body.rows.some((k) => k.guardianName && k.dateOfBirth && k.membershipNumber)).toBe(true);

    const hidden = await db.eventSeries.create({ data: { name: "Série masquée", kind: "OTHER", isActive: false } });
    const draft = await db.event.create({ data: { title: "Édition brouillon", category: "CHILDREN", startAt: new Date(), endAt: new Date(), status: "DRAFT", seriesId, editionNumber: 99 } });
    try {
      type Kids = { series: { id: string }[]; editions: { id: string }[] };
      const o = await call<Kids>("GET", "/kids", { token: outsider });
      expect(o.body.series.map((s) => s.id)).not.toContain(hidden.id);
      expect(o.body.editions.map((e) => e.id)).not.toContain(draft.id);
      expect(o.body.editions.map((e) => e.id)).toContain(edition1);
      const a = await call<Kids>("GET", "/kids", { token: admin });
      expect(a.body.series.map((s) => s.id)).toContain(hidden.id);
      expect(a.body.editions.map((e) => e.id)).toContain(draft.id);
    } finally {
      await db.event.delete({ where: { id: draft.id } });
      await db.eventSeries.delete({ where: { id: hidden.id } });
    }
  });

  it("my teams lists the teams I lead or belong to; admins list all current teams", async () => {
    const mine = await call<{ current: { id: string; role: string }[]; past: { id: string; role: string }[] }>("GET", "/teams/mine", { token: leader });
    expect(mine.status).toBe(200);
    expect([...mine.body.current, ...mine.body.past].find((t) => t.id === teamId)).toMatchObject({ role: "LEADER" });
    expect((await call("GET", "/teams", { token: leader })).status).toBe(403);
    const all = await call<{ teams: { edition: { endAt: Date } }[] }>("GET", "/teams", { token: admin });
    expect(all.status).toBe(200);
    expect(all.body.teams.every((t) => new Date(t.edition.endAt) >= new Date(Date.now() - 86400_000))).toBe(true);
  });

  it("the edition detail carries the series, teams summary, kids count and the user's role", async () => {
    const d = await call<{ event: { series: { id: string }; editionNumber: number }; teams: { id: string }[]; kidsCount: number; isLeader: boolean; isOnTeam: boolean; canManage: boolean }>("GET", `/events/${edition1}`, { token: leader });
    expect(d.body).toMatchObject({ event: { series: { id: seriesId }, editionNumber: 1 }, kidsCount: 2, isLeader: true, isOnTeam: true, canManage: false });
    expect(d.body.teams.map((t) => t.id)).toEqual([teamId]);
  });

  it("removing a kid from an edition keeps the kid record", async () => {
    expect((await call("DELETE", `/events/${edition2}/kids/${(await db.eventRegistration.findFirstOrThrow({ where: { eventId: edition2, memberId: newKidId } })).id}`, { token: leader })).body).toMatchObject({ ok: true });
    expect(await db.eventRegistration.count({ where: { eventId: edition2 } })).toBe(0);
    expect(await db.member.count({ where: { id: newKidId } })).toBe(1);
  });

  it("deleting an edition deletes its teams and their group chats", async () => {
    const chats = (await db.eventTeam.findMany({ where: { eventId: edition2 }, select: { conversationId: true } })).map((t) => t.conversationId!);
    expect(chats).toHaveLength(1);
    expect((await call("DELETE", `/events/${edition2}`, { token: admin })).body).toMatchObject({ ok: true });
    expect(await db.eventTeam.count({ where: { eventId: edition2 } })).toBe(0);
    expect(await db.conversation.count({ where: { id: { in: chats } } })).toBe(0);
  });
});

describe("suspended, pending or disabled people", () => {
  it("a suspended leader loses what their team gave them (kids, parents' phones, the team chat)", async () => {
    const amel = await memberIdOf(LEADER);
    const team = { id: teamId, name: "Les Comètes", color: "#FFB400", leaderId: amel, memberIds: [wassimId] };
    await db.member.update({ where: { id: amel }, data: { membershipStatus: "SUSPENDED" } });
    try {
      expect((await call("GET", `/events/${edition1}/kids`, { token: leader })).status).toBe(403);
      expect((await call("GET", `/members/${newKidId}`, { token: leader })).status).toBe(403);
      expect((await call("GET", `/kids/${newKidId}/history`, { token: leader })).status).toBe(403);
      expect((await call("POST", `/kids/${newKidId}`, { token: leader, body: { firstName: "Nour", lastName: "Testi" } })).status).toBe(403);
      expect((await call("POST", `/events/${edition1}/teams`, { token: leader, body: { ...team, memberIds: [] } })).status).toBe(403);
      const d = await call<{ isLeader: boolean; isOnTeam: boolean; canSeeKids: boolean; teams: { leader: { phone: string | null } | null }[] }>("GET", `/events/${edition1}`, { token: leader });
      expect(d.body).toMatchObject({ isLeader: false, isOnTeam: false, canSeeKids: false });
      expect(d.body.teams[0].leader).toMatchObject({ phone: null });
      expect((await call("GET", "/teams/mine", { token: leader })).body).toMatchObject({ current: [], past: [] });
      // The team can still be saved as it is (she stays its leader), but her login leaves the chat.
      const kept = await call<Result<unknown>>("POST", `/events/${edition1}/teams`, { token: admin, body: team });
      expect(kept.body.ok, JSON.stringify(kept.body)).toBe(true);
      expect(await participants(conversationId)).toEqual([]);
    } finally {
      await db.member.update({ where: { id: amel }, data: { membershipStatus: "ACTIVE" } });
    }
    expect((await call<Result<unknown>>("POST", `/events/${edition1}/teams`, { token: admin, body: team })).body.ok).toBe(true);
    expect(await participants(conversationId)).toEqual([{ userId: await userIdOf(LEADER), isAdmin: true }]);
    expect((await call("GET", `/events/${edition1}/kids`, { token: leader })).status).toBe(200);
  });

  it("people suspended, waiting for approval or without an active login are not team candidates and can't be added", async () => {
    const amel = await memberIdOf(LEADER);
    const stamp = Date.now();
    const make = (lastName: string, membershipStatus: string, userId?: string) =>
      db.member.create({ data: { type: "MEMBER", firstName: "Test", lastName, membershipNumber: `TST-${lastName}-${stamp}`, membershipStatus, userId } });
    const account = await db.user.create({ data: { email: `team.pending.${stamp}@example.tn`, passwordHash: "x", name: "Test Compte", status: "PENDING" } });
    const people = [await make("Suspendu", "SUSPENDED"), await make("EnAttente", "PENDING"), await make("CompteEnAttente", "ACTIVE", account.id)];
    try {
      const t = await call<{ candidates: { id: string }[] }>("GET", `/events/${edition1}/teams`, { token: admin });
      const ids = t.body.candidates.map((c) => c.id);
      expect(ids).toContain(wassimId);
      for (const m of people) {
        expect(ids).not.toContain(m.id);
        const r = await call("POST", `/events/${edition1}/teams`, { token: admin, body: { id: teamId, name: "Les Comètes", color: "#FFB400", leaderId: amel, memberIds: [wassimId, m.id] } });
        expect(r.body, m.lastName).toMatchObject({ ok: false, error: "errors.validation" });
      }
      expect((await call("POST", `/events/${edition1}/teams`, { token: admin, body: { name: "Nouvelle", color: "#123456", leaderId: people[0]!.id } })).body).toMatchObject({ ok: false, error: "errors.validation" });
      expect((await db.eventTeamMember.findMany({ where: { teamId } })).map((m) => m.memberId)).toEqual([wassimId]);
    } finally {
      await db.member.deleteMany({ where: { id: { in: people.map((p) => p.id) } } });
      await db.user.delete({ where: { id: account.id } });
    }
  });
});

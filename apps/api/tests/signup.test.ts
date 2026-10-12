import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "net";
import type { Server } from "http";
import superjson from "superjson";
import { createApp } from "@api/app";
import { db } from "@api/lib/db";
import { hashToken } from "@api/lib/auth/session";
import { takeInvitationPlace } from "@api/modules/signup/actions";
import { ageOn, parsePeopleList, splitFields } from "@api/modules/signup/lib";

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
async function call(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
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
  return { status: res.status, body: text ? (superjson.parse(text) as Record<string, unknown>) : null };
}

const PASSWORD = "Onet2026!";
async function login(email: string, password = PASSWORD) {
  const r = await call("POST", "/auth/login", { body: { email, password } });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body!.data as { token: string }).token;
}

/** "YYYY-MM-DD" of someone who turned `age` a month ago (whatever today's date). */
const dobForAge = (age: number) => {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - age);
  d.setUTCDate(d.getUTCDate() - 30);
  return d.toISOString().slice(0, 10);
};

let seq = 0;
/** A sign-up form. `name` (= "First Last") is also used by the pre-approved list imports. */
const person = (extra: Record<string, unknown> = {}) => {
  seq++;
  const firstName = "Test";
  const lastName = `Person ${seq}`;
  return {
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    dateOfBirth: dobForAge(20 + (seq % 20)),
    occupation: "STUDENT",
    occupationDetail: "ISET Mahdia — Informatique",
    email: `signup.${seq}.${Date.now()}@example.tn`,
    phone: `+216 40 ${String(100 + seq).padStart(3, "0")} ${String(500 + seq).padStart(3, "0")}`,
    password: "Signup2026x",
    ...extra,
  };
};

async function signup(body: Record<string, unknown>) {
  return call("POST", "/auth/signup", { body });
}

async function newInvitation(token: string, body: Record<string, unknown> = {}) {
  const r = await call("POST", "/approvals/invitations", { token, body: { role: "monitor", label: "Tests", ...body } });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body!.data as { id: string; token: string };
}

let adminToken = "";
beforeAll(async () => {
  adminToken = await login("gestion@onet-teboulba.tn"); // admin role (users.approve, not roles.manage)
});

describe("self sign-up", () => {
  it("without an invitation, a sign-up is PENDING and asks for the member role; its details wait on a PENDING member", async () => {
    const p = person({ occupation: "WORKER", occupationDetail: "Menuisier", dateOfBirth: dobForAge(31) });
    const r = await signup(p);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body).toMatchObject({ ok: true, data: { status: "PENDING" } });
    const token = (r.body!.data as { token: string }).token;
    const me = await call("GET", "/auth/me", { token });
    expect(me.body).toMatchObject({ email: p.email, name: p.name, roles: [], perms: [], status: "PENDING", requestedRole: "member" });
    // No permission while pending.
    expect((await call("GET", "/dashboard", { token })).status).toBe(403);
    expect((await call("GET", "/content/dances", { token })).status).toBe(403);

    const user = await db.user.findUniqueOrThrow({ where: { email: p.email }, include: { member: true } });
    expect(user.member).toMatchObject({ type: "MEMBER", membershipStatus: "PENDING", firstName: "Test", lastName: p.lastName, occupation: "WORKER", occupationDetail: "Menuisier", email: p.email });
    expect(ageOn(user.member!.dateOfBirth!)).toBe(31);
    // Approvers are notified.
    const admin = await db.user.findUniqueOrThrow({ where: { email: "gestion@onet-teboulba.tn" } });
    expect(await db.notification.count({ where: { userId: admin.id, link: "/dashboard/approvals", title: { endsWith: p.name } } })).toBe(1);
    // The pending tab shows age, occupation and phone.
    const pending = await call("GET", "/approvals/pending", { token: adminToken });
    const row = (pending.body!.rows as { id: string; age: number | null; occupation: string | null; occupationDetail: string | null; phone: string | null; known: unknown[] }[]).find((x) => x.id === user.id);
    expect(row).toMatchObject({ age: 31, occupation: "WORKER", occupationDetail: "Menuisier", phone: p.phone, known: [] });
  });

  it("requires first and last name, date of birth, occupation and its detail", async () => {
    const empty = await signup({ email: `blank.${Date.now()}@example.tn`, phone: "+216 22 345 678", password: "Signup2026x" });
    expect(empty.status).toBe(400);
    expect((empty.body as { fieldErrors: Record<string, string> }).fieldErrors).toMatchObject({
      firstName: "errors.required",
      lastName: "errors.required",
      dateOfBirth: "errors.required",
      occupation: "errors.required",
      occupationDetail: "errors.required",
    });
    const blank = await signup(person({ firstName: "  ", occupationDetail: "", occupation: "PILOT" }));
    expect((blank.body as { fieldErrors: Record<string, string> }).fieldErrors).toMatchObject({ firstName: "errors.required", occupationDetail: "errors.required", occupation: "errors.required" });
    expect((await signup(person({ occupationDetail: "x".repeat(121) }))).status).toBe(400);
    expect((await signup(person({ occupationDetail: "x".repeat(120) }))).body).toMatchObject({ ok: true });
  });

  it("accepts ages from 12 to 100 only, and real dates", async () => {
    const fe = async (dateOfBirth: string) => ((await signup(person({ dateOfBirth }))).body as { fieldErrors?: Record<string, string> }).fieldErrors?.dateOfBirth;
    expect(await fe(dobForAge(11))).toBe("errors.ageMin");
    expect(await fe(dobForAge(101))).toBe("errors.ageMax");
    expect(await fe("2010-02-30")).toBe("errors.birthDate");
    expect(await fe("not a date")).toBe("errors.birthDate");
    const tomorrow = new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10);
    expect(await fe(tomorrow)).toBe("errors.ageMin");
    expect((await signup(person({ dateOfBirth: dobForAge(12) }))).body).toMatchObject({ ok: true, data: { status: "PENDING" } });
    expect((await signup(person({ dateOfBirth: dobForAge(100) }))).body).toMatchObject({ ok: true, data: { status: "PENDING" } });
  });

  it("rejects a duplicate e-mail with a clear error, and weak passwords", async () => {
    const p = person();
    expect((await signup(p)).status).toBe(200);
    expect((await signup({ ...p, email: p.email.toUpperCase() })).body).toMatchObject({ ok: false, error: "errors.signupEmailTaken" });
    expect((await signup(person({ password: "short" }))).body).toMatchObject({ ok: false, error: "errors.weakPassword" });
  });

  it("never grants a role, staff or not, whatever the request says", async () => {
    const p = person({ role: "super_admin", roles: ["admin"], requestedRole: "admin", status: "ACTIVE" });
    const r = await signup(p);
    const me = await call("GET", "/auth/me", { token: (r.body!.data as { token: string }).token });
    expect(me.body).toMatchObject({ roles: [], status: "PENDING", requestedRole: "member" });
    // Invitations and the pre-approved list only accept monitor / member.
    for (const role of ["super_admin", "admin", "accountant", "parent", "kid"]) {
      expect((await call("POST", "/approvals/invitations", { token: adminToken, body: { role } })).status).toBe(400);
      expect((await call("POST", "/approvals/preapproved/import", { token: adminToken, body: { role, text: "X Y; x@y.tn;" } })).status).toBe(400);
    }
  });

  it("an invitation sign-up is PENDING: no permissions (403) and /auth/me exposes the status", async () => {
    const inv = await newInvitation(adminToken);
    const preview = await call("GET", `/auth/invitations/${inv.token}`);
    expect(preview.body).toMatchObject({ valid: true, role: "monitor", label: "Tests" });
    const r = await signup(person({ invite: inv.token }));
    expect(r.body).toMatchObject({ ok: true, data: { status: "PENDING" } });
    const token = (r.body!.data as { token: string }).token;
    const me = await call("GET", "/auth/me", { token });
    expect(me.body).toMatchObject({ status: "PENDING", requestedRole: "monitor", roles: [], perms: [] });
    expect((await call("GET", "/members?type=CHILD", { token })).status).toBe(403);
    expect((await call("GET", "/activities", { token })).status).toBe(403);
    expect((await call("GET", "/approvals/pending", { token })).status).toBe(403);
    const used = await db.invitation.findUniqueOrThrow({ where: { id: inv.id } });
    expect(used.uses).toBe(1);
    // Approvers are notified.
    const admin = await db.user.findUniqueOrThrow({ where: { email: "gestion@onet-teboulba.tn" } });
    expect(await db.notification.count({ where: { userId: admin.id, link: "/dashboard/approvals" } })).toBeGreaterThan(0);
  });

  it("rejects expired, revoked, full and unknown invitations", async () => {
    const expired = await newInvitation(adminToken);
    await db.invitation.update({ where: { id: expired.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await call("GET", `/auth/invitations/${expired.token}`)).body).toMatchObject({ valid: false, reason: "expired" });
    expect((await signup(person({ invite: expired.token }))).body).toMatchObject({ ok: false, error: "errors.inviteExpired" });

    const revoked = await newInvitation(adminToken);
    expect((await call("POST", `/approvals/invitations/${revoked.id}/revoke`, { token: adminToken })).status).toBe(200);
    expect((await call("GET", `/auth/invitations/${revoked.token}`)).body).toMatchObject({ valid: false, reason: "revoked" });
    expect((await signup(person({ invite: revoked.token }))).body).toMatchObject({ ok: false, error: "errors.inviteRevoked" });

    const full = await newInvitation(adminToken, { maxUses: 1 });
    expect((await signup(person({ invite: full.token }))).body).toMatchObject({ ok: true });
    expect((await call("GET", `/auth/invitations/${full.token}`)).body).toMatchObject({ valid: false, reason: "full" });
    expect((await signup(person({ invite: full.token }))).body).toMatchObject({ ok: false, error: "errors.inviteFull" });

    expect((await call("GET", "/auth/invitations/not-a-real-token")).body).toMatchObject({ valid: false, reason: "invalid" });
    const unknown = person({ invite: "not-a-real-token" });
    expect((await signup(unknown)).body).toMatchObject({ ok: false, error: "errors.inviteInvalid" });
    // A failed sign-up creates nothing.
    expect(await db.invitation.findFirst({ where: { tokenHash: hashToken("not-a-real-token") } })).toBeNull();
    expect(await db.user.findUnique({ where: { email: unknown.email } })).toBeNull();
    expect(await db.member.count({ where: { email: unknown.email } })).toBe(0);
    expect((await call("POST", "/approvals/invitations", { token: adminToken, body: { role: "monitor", maxUses: 501 } })).status).toBe(400);
  });

  it("a pre-approved e-mail or phone gets the role immediately and the entry is marked used", async () => {
    const byEmail = person({ occupation: "OTHER", occupationDetail: "Au foyer" });
    const byPhone = person();
    const imp = await call("POST", "/approvals/preapproved/import", {
      token: adminToken,
      body: { role: "monitor", text: `Nom;E-mail;Téléphone\n${byEmail.name}; ${byEmail.email.toUpperCase()};\n${byPhone.name}, , 00216${byPhone.phone.replace(/\D/g, "").slice(3)}\n\nNo contact;;\n;x@y.tn;\nBad mail; nope;\n${byEmail.name}; ${byEmail.email};` },
    });
    expect(imp.body).toMatchObject({ ok: true, data: { added: 2, duplicates: 1, duplicateLines: [8] } });
    expect((imp.body!.data as { invalid: { line: number; reason: string }[] }).invalid).toEqual([
      { line: 5, reason: "contact" },
      { line: 6, reason: "name" },
      { line: 7, reason: "email" },
    ]);

    // Works with or without an invitation link: the list wins over the link.
    const inv = await newInvitation(adminToken, { role: "member" });
    const r = await signup({ ...byEmail, invite: inv.token });
    expect(r.body).toMatchObject({ ok: true, data: { status: "ACTIVE" } });
    const me = await call("GET", "/auth/me", { token: (r.body!.data as { token: string }).token });
    expect(me.body).toMatchObject({ roles: ["monitor"], status: "ACTIVE", memberType: "MONITOR" });
    const entry = await db.preapprovedPerson.findFirstOrThrow({ where: { email: byEmail.email } });
    expect(entry.usedById).toBe((me.body as { id: string }).id);
    expect(entry.usedAt).toBeInstanceOf(Date);
    // The member record keeps what was asked at sign-up.
    expect(await db.member.findUniqueOrThrow({ where: { userId: entry.usedById! } })).toMatchObject({ membershipStatus: "ACTIVE", occupation: "OTHER", occupationDetail: "Au foyer", firstName: "Test" });

    const r2 = await signup({ ...byPhone, phone: `+216 ${byPhone.phone.replace(/\D/g, "").slice(3)}` });
    const me2 = await call("GET", "/auth/me", { token: (r2.body!.data as { token: string }).token });
    expect(me2.body).toMatchObject({ roles: ["monitor"], memberType: "MONITOR" });

    // Used entries can't be deleted; the list shows who activated them.
    expect((await call("DELETE", `/approvals/preapproved/${entry.id}`, { token: adminToken })).status).toBe(404);
    const list = await call("GET", "/approvals/preapproved?filter=used", { token: adminToken });
    expect((list.body!.rows as { id: string; usedBy: { email: string } | null }[]).find((x) => x.id === entry.id)?.usedBy?.email).toBe(byEmail.email);
  });
});

describe("approvals", () => {
  it("approve gives the requested role and activates the member with its sign-up details", async () => {
    const inv = await newInvitation(adminToken, { role: "monitor" });
    const p = person({ invite: inv.token, occupation: "STUDENT", occupationDetail: "Lycée de Teboulba — Sciences" });
    const r = await signup(p);
    const userToken = (r.body!.data as { token: string }).token;
    const pending = await call("GET", "/approvals/pending", { token: adminToken });
    const row = (pending.body!.rows as { id: string; email: string; invitationLabel: string | null; occupation: string | null }[]).find((x) => x.email === p.email)!;
    expect(row).toMatchObject({ invitationLabel: "Tests", occupation: "STUDENT" });

    const ok = await call("POST", "/approvals/approve", { token: adminToken, body: { ids: [row.id] } });
    expect(ok.body).toMatchObject({ ok: true, data: { count: 1 } });
    const me = await call("GET", "/auth/me", { token: userToken });
    expect(me.body).toMatchObject({ status: "ACTIVE", roles: ["monitor"], memberType: "MONITOR" });
    expect((await call("GET", "/activities", { token: userToken })).status).toBe(200);
    const member = await db.member.findUniqueOrThrow({ where: { userId: row.id } });
    expect(member).toMatchObject({ membershipStatus: "ACTIVE", type: "MONITOR", occupation: "STUDENT", occupationDetail: "Lycée de Teboulba — Sciences" });
    expect(member.membershipNumber).toMatch(/^ONT-\d{4}$/);
    // Approving again is a no-op.
    expect((await call("POST", "/approvals/approve", { token: adminToken, body: { ids: [row.id] } })).body).toMatchObject({ ok: true, data: { count: 0 } });
    expect(await db.auditLog.count({ where: { action: "approve", entity: "User", entityId: row.id } })).toBe(1);
  });

  it("a member sign-up without invitation becomes a member on approval", async () => {
    const p = person();
    const r = await signup(p);
    const userToken = (r.body!.data as { token: string }).token;
    const user = await db.user.findUniqueOrThrow({ where: { email: p.email } });
    expect((await call("POST", "/approvals/approve", { token: adminToken, body: { ids: [user.id] } })).body).toMatchObject({ ok: true, data: { count: 1 } });
    expect((await call("GET", "/auth/me", { token: userToken })).body).toMatchObject({ status: "ACTIVE", roles: ["member"], memberType: "MEMBER" });
    expect((await call("GET", "/dashboard", { token: userToken })).body).toMatchObject({ kind: "member" });
  });

  it("reject blocks access: the session ends, signing in is refused and the pending member is removed", async () => {
    const inv = await newInvitation(adminToken, { role: "member" });
    const p = person({ invite: inv.token });
    const r = await signup(p);
    const userToken = (r.body!.data as { token: string }).token;
    const user = await db.user.findUniqueOrThrow({ where: { email: p.email } });
    expect(await db.member.count({ where: { userId: user.id } })).toBe(1);
    expect((await call("POST", "/approvals/reject", { token: adminToken, body: { ids: [user.id] } })).body).toMatchObject({ ok: true, data: { count: 1 } });
    expect((await call("GET", "/auth/me", { token: userToken })).body).toBeNull();
    const again = await call("POST", "/auth/login", { body: { email: p.email, password: p.password } });
    expect(again.body).toMatchObject({ ok: false, error: "errors.accountRejected" });
    expect(await db.member.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.member.count({ where: { email: p.email } })).toBe(0);
  });

  it("only users.approve holders can use the admin endpoints", async () => {
    const monitor = await login("moniteur@onet-teboulba.tn");
    const accountant = await login("comptable@onet-teboulba.tn");
    for (const token of [monitor, accountant]) {
      expect((await call("GET", "/approvals/pending", { token })).status).toBe(403);
      expect((await call("GET", "/approvals/invitations", { token })).status).toBe(403);
      expect((await call("GET", "/approvals/preapproved", { token })).status).toBe(403);
      expect((await call("POST", "/approvals/approve", { token, body: { ids: ["x"] } })).status).toBe(403);
      expect((await call("POST", "/approvals/reject", { token, body: { ids: ["x"] } })).status).toBe(403);
      expect((await call("POST", "/approvals/invitations", { token, body: { role: "monitor" } })).status).toBe(403);
      expect((await call("POST", "/approvals/preapproved/import", { token, body: { role: "monitor", text: "A B; a@b.tn;" } })).status).toBe(403);
    }
    expect((await call("GET", "/approvals/pending")).status).toBe(401);
    // The super admin (all permissions) and the admin (default grants) may.
    expect((await call("GET", "/approvals/pending", { token: await login("admin@onet-teboulba.tn") })).status).toBe(200);
    const me = await call("GET", "/auth/me", { token: adminToken });
    expect((me.body as { pendingApprovals: number }).pendingApprovals).toBeGreaterThan(0);
  });

  it("bulk endpoints cap the batch size", async () => {
    const ids = Array.from({ length: 501 }, (_, i) => `id${i}`);
    expect((await call("POST", "/approvals/approve", { token: adminToken, body: { ids } })).status).toBe(400);
    expect((await call("POST", "/approvals/reject", { token: adminToken, body: { ids: [] } })).status).toBe(400);
  });
});

describe("invitation places", () => {
  it("an invitation that has just expired can't be used, even by the atomic update", async () => {
    const created = await newInvitation(adminToken);
    const now = new Date();
    await db.invitation.update({ where: { id: created.id }, data: { expiresAt: new Date(now.getTime() - 1) } });
    expect(await takeInvitationPlace(db, created.id, now)).toBe(false);
    await db.invitation.update({ where: { id: created.id }, data: { expiresAt: now } });
    expect(await takeInvitationPlace(db, created.id, now)).toBe(false);
    await db.invitation.update({ where: { id: created.id }, data: { expiresAt: new Date(now.getTime() + 1) } });
    expect(await takeInvitationPlace(db, created.id, now)).toBe(true);
    expect((await db.invitation.findUniqueOrThrow({ where: { id: created.id } })).uses).toBe(1);
  });

  it("the invitations counter only counts usable links", async () => {
    const counts = async () => ((await call("GET", "/approvals/invitations", { token: adminToken })).body!.counts as { invitations: number }).invitations;
    const before = await counts();
    const full = await newInvitation(adminToken, { maxUses: 1 });
    expect(await counts()).toBe(before + 1);
    await db.invitation.update({ where: { id: full.id }, data: { uses: 1 } });
    expect(await counts()).toBe(before);
  });
});

describe("existing member records", () => {
  const unlinked = (type: "MONITOR" | "MEMBER" | "PARENT", email: string) =>
    db.member.create({ data: { type, firstName: "Old", lastName: "Record", email, membershipNumber: `TST-${type}-${++seq}-${Date.now()}`, membershipStatus: "ACTIVE" } });
  const approve = (id: string) => call("POST", "/approvals/approve", { token: adminToken, body: { ids: [id] } });
  const memberOf = async (email: string) => {
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    return db.member.findUniqueOrThrow({ where: { userId: user.id } });
  };

  it("approval links the one unlinked member of that type with the same e-mail, completing its empty fields", async () => {
    const inv = await newInvitation(adminToken, { role: "monitor" });
    const p = person({ invite: inv.token, occupation: "WORKER", occupationDetail: "Infirmière", dateOfBirth: dobForAge(27) });
    const existing = await unlinked("MONITOR", p.email.toUpperCase());
    // Known by phone too, whatever its formatting.
    const digits = p.phone.replace(/\D/g, "").slice(3);
    const byPhone = await db.member.create({
      data: { type: "PARENT", firstName: "Same", lastName: "Phone", phone: `00216 (${digits.slice(0, 2)}) ${digits.slice(2, 5)}/${digits.slice(5)}`, membershipNumber: `TST-P-${++seq}-${Date.now()}` },
    });
    await signup(p);
    const user = await db.user.findUniqueOrThrow({ where: { email: p.email } });
    const pending = await call("GET", "/approvals/pending", { token: adminToken });
    const row = (pending.body!.rows as { id: string; known: { id: string }[] }[]).find((x) => x.id === user.id)!;
    // The sign-up's own PENDING record is not "already known".
    expect(row.known.map((k) => k.id).sort()).toEqual([existing.id, byPhone.id].sort());
    expect((await approve(user.id)).body).toMatchObject({ ok: true, data: { count: 1 } });
    const linked = await memberOf(p.email);
    expect(linked.id).toBe(existing.id);
    // Empty fields are filled from the sign-up; the existing name is kept.
    expect(linked).toMatchObject({ firstName: "Old", lastName: "Record", occupation: "WORKER", occupationDetail: "Infirmière", phone: p.phone });
    expect(ageOn(linked.dateOfBirth!)).toBe(27);
    // The temporary PENDING record is gone.
    expect(await db.member.count({ where: { email: { in: [p.email, p.email.toUpperCase()] } } })).toBe(1);
  });

  it("a pre-approved activation links the existing record too, without overwriting what it knows", async () => {
    const p = person({ occupation: "STUDENT", occupationDetail: "Faculté des sciences" });
    const existing = await unlinked("MEMBER", p.email);
    await db.member.update({ where: { id: existing.id }, data: { occupation: "WORKER", occupationDetail: "Boulanger" } });
    await call("POST", "/approvals/preapproved/import", { token: adminToken, body: { role: "member", text: `${p.name}; ${p.email};` } });
    expect((await signup(p)).body).toMatchObject({ ok: true, data: { status: "ACTIVE" } });
    const linked = await memberOf(p.email);
    expect(linked).toMatchObject({ id: existing.id, occupation: "WORKER", occupationDetail: "Boulanger" });
    expect(linked.dateOfBirth).toBeInstanceOf(Date);
  });

  it("creates a new record when the match is ambiguous or of another type, and never takes over a parent", async () => {
    // Two candidates: ambiguous.
    const p = person({ invite: (await newInvitation(adminToken, { role: "member" })).token });
    const a = await unlinked("MEMBER", p.email);
    const b = await unlinked("MEMBER", p.email);
    await signup(p);
    await approve((await db.user.findUniqueOrThrow({ where: { email: p.email } })).id);
    const own = await memberOf(p.email);
    expect([a.id, b.id]).not.toContain(own.id);
    expect(own.membershipStatus).toBe("ACTIVE");

    // Another type.
    const q = person({ invite: (await newInvitation(adminToken, { role: "monitor" })).token });
    const other = await unlinked("MEMBER", q.email);
    await signup(q);
    await approve((await db.user.findUniqueOrThrow({ where: { email: q.email } })).id);
    expect((await memberOf(q.email)).id).not.toBe(other.id);

    // A parent record is never taken over (its children would come with it).
    const r = person();
    const parent = await unlinked("PARENT", r.email);
    expect((await signup(r)).body).toMatchObject({ ok: true, data: { status: "PENDING" } });
    await approve((await db.user.findUniqueOrThrow({ where: { email: r.email } })).id);
    expect((await memberOf(r.email)).id).not.toBe(parent.id);
    expect((await db.member.findUniqueOrThrow({ where: { id: parent.id } })).userId).toBeNull();
  });

  it("caps sign-up name parts at 40 characters", async () => {
    expect((await signup(person({ firstName: "b".repeat(41) }))).status).toBe(400);
    expect((await signup(person({ lastName: "b".repeat(41) }))).status).toBe(400);
    const ok = person({ firstName: "a".repeat(40), lastName: "b".repeat(40) });
    expect((await signup(ok)).body).toMatchObject({ ok: true });
    expect((await db.user.findUniqueOrThrow({ where: { email: ok.email } })).name.length).toBeLessThanOrEqual(80);
  });
});

describe("age", () => {
  it("counts whole years in Tunisia's calendar", () => {
    const now = new Date("2026-10-12T10:00:00Z");
    expect(ageOn(new Date(Date.UTC(2014, 9, 12)), now)).toBe(12);
    expect(ageOn(new Date(Date.UTC(2014, 9, 13)), now)).toBe(11);
    // 23:30 UTC on Oct 11 is already Oct 12 in Tunis (UTC+1): the birthday has come.
    expect(ageOn(new Date(Date.UTC(2014, 9, 12)), new Date("2026-10-11T23:30:00Z"))).toBe(12);
  });
});

describe("pre-approved list parsing", () => {
  it('honours double quotes: separators inside them are kept and "" is a quote', () => {
    expect(splitFields(`"Ben Ali, Sami", sami@x.tn, "22 345 678"`, ",")).toEqual(["Ben Ali, Sami", "sami@x.tn", "22 345 678"]);
    expect(splitFields(`"Leila ""Lili"" Nasri";l@x.tn;`, ";")).toEqual([`Leila "Lili" Nasri`, "l@x.tn", ""]);
    const { people, invalid } = parsePeopleList(`"Ben Ali, Sami",sami@x.tn,"22 345 678"\n"Nasri; Leila";leila@x.tn;`);
    expect(invalid).toEqual([]);
    expect(people).toEqual([
      { line: 1, name: "Ben Ali, Sami", email: "sami@x.tn", phone: "21622345678" },
      { line: 2, name: "Nasri; Leila", email: "leila@x.tn", phone: null },
    ]);
  });

  it("skips a header on the first non-blank line only", () => {
    const { people, invalid } = parsePeopleList(`\n\n"Nom";"E-mail";"Téléphone"\nA B;a@b.tn;\nNom;E-mail;Téléphone`);
    expect(people.map((p) => p.line)).toEqual([4]);
    expect(invalid).toEqual([{ line: 5, reason: "email" }]);
  });

  it("rejects names longer than 80 characters", () => {
    expect(parsePeopleList(`${"x".repeat(81)};a@b.tn;`).invalid).toEqual([{ line: 1, reason: "name" }]);
  });
});

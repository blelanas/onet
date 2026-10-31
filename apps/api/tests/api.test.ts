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
afterAll(() => new Promise((r) => server.close(r)));

async function call(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? (superjson.parse(text) as Record<string, unknown>) : null };
}

async function login(email: string) {
  const r = await call("POST", "/auth/login", { body: { email, password: "Onet2026!" } });
  expect(r.status).toBe(200);
  return (r.body!.data as { token: string }).token;
}

describe("auth", () => {
  it("rejects a wrong password with an i18n error key", async () => {
    const r = await call("POST", "/auth/login", { body: { email: "admin@onet-teboulba.tn", password: "nope" } });
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ ok: false, error: "errors.invalidCredentials" });
  });

  it("issues a bearer token and resolves the current user", async () => {
    const token = await login("comptable@onet-teboulba.tn");
    const me = await call("GET", "/auth/me", { token });
    expect(me.body).toMatchObject({ email: "comptable@onet-teboulba.tn", roles: ["accountant"] });
  });

  it("logout revokes the token", async () => {
    const token = await login("membre@onet-teboulba.tn");
    await call("POST", "/auth/logout", { token });
    expect((await call("GET", "/auth/me", { token })).body).toBeNull();
  });
});

describe("permission enforcement on the API", () => {
  it("401 for anonymous requests", async () => {
    expect((await call("GET", "/members?type=CHILD")).status).toBe(401);
  });

  it("403 when an accountant lists groups", async () => {
    expect((await call("GET", "/groups", { token: await login("comptable@onet-teboulba.tn") })).status).toBe(403);
  });

  it("accounts never get the retired parent, kid or monitor roles", async () => {
    const token = await login("admin@onet-teboulba.tn");
    for (const role of ["parent", "kid", "monitor"]) {
      const r = await call("POST", "/settings/users", { token, body: { name: "No", email: `no-${role}@x.tn`, password: "Abcdefg123", roles: [role] } });
      expect(r.status, role).toBe(400);
      expect(r.body).toMatchObject({ ok: false, error: "errors.validation" });
    }
    const ok = await call("POST", "/settings/users", { token, body: { name: "Yes", email: "yes-member@x.tn", password: "Abcdefg123", roles: ["member"] } });
    expect(ok.body).toMatchObject({ ok: true });
    const id = (ok.body!.data as { id: string }).id;
    try {
      const edit = await call("POST", `/settings/users/${id}/roles`, { token, body: { roles: ["member", "kid"] } });
      expect(edit.body).toMatchObject({ ok: false, error: "errors.validation" });
      // The roles offered by the settings pages are the four account roles.
      const roles = ((await call("GET", "/settings/users", { token })).body!.roles as { key: string }[]).map((r) => r.key);
      expect(roles).toEqual(expect.arrayContaining(["super_admin", "admin", "accountant", "member"]));
      expect(roles.some((k) => ["parent", "kid", "monitor"].includes(k))).toBe(false);
    } finally {
      await db.user.delete({ where: { id } });
    }
  });

  it("an old parent-only account can't be reactivated as such", async () => {
    const token = await login("admin@onet-teboulba.tn");
    const role = await db.role.findUniqueOrThrow({ where: { key: "parent" } });
    const u = await db.user.create({ data: { email: "old-parent@x.tn", name: "Old parent", passwordHash: "x", isActive: false, roles: { create: [{ roleId: role.id }] } } });
    try {
      expect((await call("POST", `/settings/users/${u.id}/active`, { token, body: { active: true } })).body).toMatchObject({ ok: false, error: "errors.validation" });
      expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).isActive).toBe(false);
    } finally {
      await db.user.delete({ where: { id: u.id } });
    }
  });

  it("editing an old parent-only account drops its retired role and hides it from the users list", async () => {
    const token = await login("admin@onet-teboulba.tn");
    const role = await db.role.findUniqueOrThrow({ where: { key: "parent" } });
    const u = await db.user.create({ data: { email: "old-parent-roles@x.tn", name: "Old parent roles", passwordHash: "x", isActive: false, roles: { create: [{ roleId: role.id }] } } });
    try {
      // The users list doesn't show the retired role, and the role filter still works.
      const listed = await call("GET", "/settings/users?q=old-parent-roles", { token });
      const row = (listed.body!.rows as { id: string; roles: { role: { key: string } }[] }[]).find((r) => r.id === u.id);
      expect(row?.roles).toEqual([]);
      const byRole = (await call("GET", "/settings/users?role=member", { token })).body!.rows as { roles: { role: { key: string } }[] }[];
      expect(byRole.length).toBeGreaterThan(0);
      expect(byRole.every((r) => r.roles.some((x) => x.role.key === "member"))).toBe(true);

      // Re-submitting the retired role along with an account role keeps only the account role.
      const r = await call("POST", `/settings/users/${u.id}/roles`, { token, body: { roles: ["member", "parent"] } });
      expect(r.body).toMatchObject({ ok: true });
      const keys = (await db.userRole.findMany({ where: { userId: u.id }, select: { role: { select: { key: true } } } })).map((x) => x.role.key);
      expect(keys).toEqual(["member"]);
      // Submitting only the retired role would leave no account role: refused.
      await db.userRole.deleteMany({ where: { userId: u.id } });
      await db.userRole.create({ data: { userId: u.id, roleId: role.id } });
      expect((await call("POST", `/settings/users/${u.id}/roles`, { token, body: { roles: ["parent"] } })).body).toMatchObject({ ok: false, error: "errors.validation" });
    } finally {
      await db.user.delete({ where: { id: u.id } });
    }
  });

  it("kids and parents are records: no login account can be created for them", async () => {
    const token = await login("admin@onet-teboulba.tn");
    for (const type of ["CHILD", "PARENT"] as const) {
      const m = await db.member.findFirstOrThrow({ where: { type, userId: null } });
      const r = await call("POST", `/members/${m.id}/account`, { token, body: { email: `rec-${type.toLowerCase()}@x.tn`, password: "Abcdefg123", role: "member" } });
      expect(r.status, type).toBe(400);
    }
  });

  it("forbids mutations without the manage permission", async () => {
    const token = await login("moniteur@onet-teboulba.tn");
    const r = await call("POST", "/members", { token, body: { type: "CHILD", firstName: "X", lastName: "Y" } });
    expect(r.status).toBe(403);
    expect(r.body).toMatchObject({ ok: false, error: "errors.forbidden" });
  });

  it("validates input and returns field errors", async () => {
    const token = await login("admin@onet-teboulba.tn");
    const r = await call("POST", "/members", { token, body: { type: "CHILD", firstName: "", lastName: "Y" } });
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ ok: false, error: "errors.validation" });
    expect((r.body!.fieldErrors as Record<string, string>).firstName).toBe("errors.required");
  });
});

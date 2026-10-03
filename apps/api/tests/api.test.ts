import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "net";
import type { Server } from "http";
import superjson from "superjson";
import { createApp } from "@api/app";

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
    const token = await login("parent@onet-teboulba.tn");
    const me = await call("GET", "/auth/me", { token });
    expect(me.body).toMatchObject({ email: "parent@onet-teboulba.tn", roles: ["parent"] });
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

  it("403 when a kid lists children or a parent lists all members", async () => {
    expect((await call("GET", "/members?type=CHILD", { token: await login("enfant@onet-teboulba.tn") })).status).toBe(403);
    expect((await call("GET", "/members", { token: await login("parent@onet-teboulba.tn") })).status).toBe(403);
  });

  it("a parent only sees their own children", async () => {
    const token = await login("parent@onet-teboulba.tn");
    const r = await call("GET", "/members?type=CHILD", { token });
    const rows = r.body!.rows as { lastName: string }[];
    expect(rows).toHaveLength(3);
    expect(rows.every((m) => m.lastName === "Gharbi")).toBe(true);
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

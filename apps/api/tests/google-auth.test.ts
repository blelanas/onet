import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "net";
import type { Server } from "http";
import superjson from "superjson";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { createApp } from "@api/app";
import { env } from "@api/env";
import { db } from "@api/lib/db";
import { createGoogleVerifier, setGoogleVerifier, type GoogleIdentity } from "@api/lib/auth/google";

const CLIENT_ID = "test-client.apps.googleusercontent.com";
let server: Server;
let base = "";

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});
const created: string[] = [];
afterAll(async () => {
  try {
    await db.user.deleteMany({ where: { id: { in: created } } });
  } finally {
    setGoogleVerifier(null);
    env.GOOGLE_CLIENT_ID = undefined;
    await new Promise((r) => server.close(r));
    await db.$disconnect();
  }
});

// Each request comes from its own client IP (trusted proxy hop) so the per-IP limiters don't interfere.
let ipSeq = 0;
async function call(method: string, path: string, opts: { token?: string; body?: unknown; ip?: string } = {}) {
  ipSeq++;
  const res = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": opts.ip ?? `10.88.${Math.floor(ipSeq / 250)}.${ipSeq % 250}`,
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? (superjson.parse(text) as Record<string, unknown>) : null };
}

/**
 * Fake Google: the "credential" is `<verified|unverified>:<email>`; anything else is an invalid token.
 * The real signature/issuer/audience checks are covered separately below with a local key set.
 */
function fakeVerifier(credential: string, clientId: string): Promise<GoogleIdentity> {
  expect(clientId).toBe(CLIENT_ID);
  const m = /^(verified|unverified):(.+)$/.exec(credential);
  if (!m) return Promise.reject(new Error("invalid token"));
  return Promise.resolve({ sub: `sub-${m[2]}`, email: m[2]!, emailVerified: m[1] === "verified", name: "Google Person" });
}

const google = (credential: string, ip?: string) => call("POST", "/auth/google", { body: { credential }, ip });

async function makeUser(data: { email: string; isActive?: boolean; status?: string }) {
  const u = await db.user.create({ data: { name: "Google Test", passwordHash: "x", ...data } });
  created.push(u.id);
  return u;
}

describe("POST /auth/google", () => {
  it("answers 'not configured' when GOOGLE_CLIENT_ID is unset", async () => {
    env.GOOGLE_CLIENT_ID = undefined;
    setGoogleVerifier(fakeVerifier);
    const r = await google("verified:membre@onet-teboulba.tn");
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ ok: false, error: "errors.googleNotConfigured" });
  });

  describe("when configured", () => {
    beforeAll(() => {
      env.GOOGLE_CLIENT_ID = CLIENT_ID;
      setGoogleVerifier(fakeVerifier);
    });

    it("rejects a missing or invalid token, and audits the failure", async () => {
      expect((await google("")).body).toMatchObject({ ok: false, error: "errors.validation" });
      const before = await db.auditLog.count({ where: { action: "login_failed", details: { contains: "invalid_token" } } });
      const r = await google("not-a-google-token");
      expect(r.status).toBe(400);
      expect(r.body).toMatchObject({ ok: false, error: "errors.googleInvalid" });
      expect(await db.auditLog.count({ where: { action: "login_failed", details: { contains: "invalid_token" } } })).toBe(before + 1);
    });

    it("throttles repeated invalid tokens from one client", async () => {
      const ip = "10.99.1.1";
      for (let i = 0; i < 5; i++) expect((await google("bad", ip)).body).toMatchObject({ error: "errors.googleInvalid" });
      expect((await google("verified:membre@onet-teboulba.tn", ip)).body).toMatchObject({ ok: false, error: "errors.tooManyAttempts" });
    });

    it("refuses an e-mail Google hasn't verified", async () => {
      const r = await google("unverified:membre@onet-teboulba.tn");
      expect(r.body).toMatchObject({ ok: false, error: "errors.googleUnverified" });
    });

    it("never creates an account for an unknown e-mail: answers googleNoAccount", async () => {
      const email = `nobody.${Date.now()}@gmail.com`;
      const r = await google(`verified:${email}`);
      expect(r.status).toBe(400);
      expect(r.body).toMatchObject({ ok: false, error: "errors.googleNoAccount" });
      expect(await db.user.count({ where: { email } })).toBe(0);
      expect(await db.auditLog.count({ where: { action: "login_failed", details: { contains: email } } })).toBe(1);
    });

    it("refuses an inactive account", async () => {
      const u = await makeUser({ email: `inactive.${Date.now()}@example.tn`, isActive: false });
      const r = await google(`verified:${u.email}`);
      expect(r.body).toMatchObject({ ok: false, error: "errors.accountInactive" });
      expect(await db.session.count({ where: { userId: u.id } })).toBe(0);
    });

    it("refuses a rejected sign-up, like the password login", async () => {
      const u = await makeUser({ email: `rejected.${Date.now()}@example.tn`, status: "REJECTED" });
      const r = await google(`verified:${u.email}`);
      expect(r.body).toMatchObject({ ok: false, error: "errors.accountRejected" });
      expect(await db.session.count({ where: { userId: u.id } })).toBe(0);
    });

    it("signs a pending sign-up in (waiting screen), like the password login", async () => {
      const u = await makeUser({ email: `pending.${Date.now()}@example.tn`, status: "PENDING" });
      const r = await google(`verified:${u.email}`);
      expect(r.body).toMatchObject({ ok: true });
      const token = (r.body!.data as { token: string }).token;
      const me = await call("GET", "/auth/me", { token });
      expect(me.body).toMatchObject({ email: u.email, status: "PENDING", roles: [], perms: [] });
      expect((await call("GET", "/dashboard", { token })).status).toBe(403);
    });

    it("signs in an existing account (e-mail matched case-insensitively) with a working session", async () => {
      const r = await google("verified:Membre@ONET-Teboulba.tn");
      expect(r.status).toBe(200);
      expect(r.body).toMatchObject({ ok: true, message: "toast.welcome", data: { locale: expect.any(String) } });
      const token = (r.body!.data as { token: string }).token;
      expect(token).toMatch(/^[\w-]{40,}$/);
      const me = await call("GET", "/auth/me", { token });
      expect(me.status).toBe(200);
      expect(me.body).toMatchObject({ email: "membre@onet-teboulba.tn", status: "ACTIVE" });
      const user = await db.user.findUniqueOrThrow({ where: { email: "membre@onet-teboulba.tn" } });
      expect(user.lastLoginAt).not.toBeNull();
      expect(await db.auditLog.count({ where: { userId: user.id, action: "login", details: { contains: "google" } } })).toBeGreaterThan(0);
      // The session is an ordinary one: logout revokes it.
      await call("POST", "/auth/logout", { token });
      expect((await call("GET", "/auth/me", { token })).body).toBeNull();
    });
  });
});

describe("Google ID token verification (jose)", () => {
  type PrivateKey = Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];
  let key: PrivateKey;
  let verify: ReturnType<typeof createGoogleVerifier>;
  const now = () => Math.floor(Date.now() / 1000);

  beforeAll(async () => {
    const pair = await generateKeyPair("RS256");
    key = pair.privateKey;
    const jwk: JWK = { ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256", use: "sig" };
    verify = createGoogleVerifier(createLocalJWKSet({ keys: [jwk] }));
  });

  const sign = (claims: Record<string, unknown>, opts: { iss?: string; aud?: string; exp?: number; signer?: PrivateKey } = {}) =>
    new SignJWT({ email: "someone@gmail.com", email_verified: true, name: "Some One", ...claims })
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setSubject("1234567890")
      .setIssuer(opts.iss ?? "https://accounts.google.com")
      .setAudience(opts.aud ?? CLIENT_ID)
      .setIssuedAt()
      .setExpirationTime(opts.exp ?? now() + 3600)
      .sign(opts.signer ?? key);

  it("accepts a valid token from either Google issuer", async () => {
    expect(await verify(await sign({}), CLIENT_ID)).toEqual({ sub: "1234567890", email: "someone@gmail.com", emailVerified: true, name: "Some One" });
    expect(await verify(await sign({}, { iss: "accounts.google.com" }), CLIENT_ID)).toMatchObject({ emailVerified: true });
  });

  it("only treats email_verified === true as verified", async () => {
    expect(await verify(await sign({ email_verified: "true" }), CLIENT_ID)).toMatchObject({ emailVerified: false });
  });

  it("rejects another audience, another issuer, an expired token and a foreign signature", async () => {
    await expect(verify(await sign({}, { aud: "someone-else.apps.googleusercontent.com" }), CLIENT_ID)).rejects.toThrow();
    await expect(verify(await sign({}, { iss: "https://evil.example.com" }), CLIENT_ID)).rejects.toThrow();
    await expect(verify(await sign({}, { exp: now() - 600 }), CLIENT_ID)).rejects.toThrow();
    const other = (await generateKeyPair("RS256")).privateKey;
    await expect(verify(await sign({}, { signer: other }), CLIENT_ID)).rejects.toThrow();
    await expect(verify("not.a.jwt", CLIENT_ID)).rejects.toThrow();
  });
});

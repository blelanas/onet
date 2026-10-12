import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "net";
import type { Server } from "http";
import superjson from "superjson";
import fr from "@onet/shared/messages/fr.json";
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
async function call(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
  ipSeq++;
  const res = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": `10.82.${Math.floor(ipSeq / 250)}.${ipSeq % 250}`,
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let body: Record<string, unknown> | null = null;
  try {
    body = text ? (superjson.parse(text) as Record<string, unknown>) : null;
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body, text, type: res.headers.get("content-type") ?? "" };
}

async function login(email: string) {
  const r = await call("POST", "/auth/login", { body: { email, password: "Onet2026!" } });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body!.data as { token: string }).token;
}

const ERR = fr.trips.errors;
const DAY = 86400_000;

type Row = { id: string; status: string; type: string; age: number | null; phone: string | null; guardian: { name: string } | null; amountDue: number; paid: number; remaining: number; methods: string[]; member: { id: string; firstName: string } };
type Totals = { participants: number; expected: number; collected: number; outstanding: number; byMethod: { method: string; amount: number }[] };

const T: Record<string, string> = {};
let tripId = "";
let managerMemberId = "";

beforeAll(async () => {
  for (const [k, email] of Object.entries({ manager: "membre@onet-teboulba.tn", monitor: "karim.jaziri@onet-teboulba.tn", parent: "parent@onet-teboulba.tn", admin: "gestion@onet-teboulba.tn", accountant: "comptable@onet-teboulba.tn" })) {
    T[k] = await login(email);
  }
  managerMemberId = (await db.member.findFirstOrThrow({ where: { user: { email: "membre@onet-teboulba.tn" } } })).id;
  const departAt = new Date(Date.now() + 30 * DAY);
  const trip = await db.trip.create({
    data: {
      title: "Sortie test à Sousse",
      destination: "Sousse",
      category: "EXCURSION",
      departureLocation: "Maison de l'enfance",
      departAt,
      returnAt: new Date(departAt.getTime() + 8 * 3600_000),
      price: 30_000,
      capacity: 10,
      isPublic: false,
      monitors: { create: [{ memberId: managerMemberId }] },
    },
  });
  tripId = trip.id;
});

const participants = async (token = T.manager) => {
  const r = await call("GET", `/trips/${tripId}/participants`, { token });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body as { rows: Row[]; totals: Totals; closed: unknown; canManage: boolean; canReopen: boolean };
};

describe("trip managers", () => {
  let newKidId = "";
  let newKidReg = "";
  let existingReg = "";

  it("only admins and the trip's managers manage the list", async () => {
    const kid = await db.member.findFirstOrThrow({ where: { type: "CHILD" } });
    for (const token of [T.monitor, T.parent]) {
      expect((await call("POST", `/trips/${tripId}/participants`, { token, body: { memberId: kid.id } })).status).toBe(403);
      expect((await call("POST", `/trips/${tripId}/finalize`, { token })).status).toBe(403);
    }
    expect((await call("GET", `/trips/${tripId}/candidates?q=a`, { token: T.monitor })).status).toBe(403);
    const detail = await call("GET", `/trips/${tripId}`, { token: T.manager });
    expect(detail.status, JSON.stringify(detail.body)).toBe(200);
    expect(detail.body).toMatchObject({ canManage: true, isManager: true, listClosedAt: null, entries: [] });
    expect((detail.body!.managers as { memberId: string }[]).map((m) => m.memberId)).toEqual([managerMemberId]);
  });

  it("a manager adds a new person: child + parent contact + guardianship + registration + invoice", async () => {
    const r = await call("POST", `/trips/${tripId}/participants`, {
      token: T.manager,
      body: { firstName: "Rayen", lastName: "Testeur", dateOfBirth: "2016-04-12", parentName: "Hédi Testeur", parentPhone: "+216 52 000 111", parentRelation: "FATHER" },
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const data = r.body!.data as { id: string; memberId: string; status: string; invoiceId: string };
    newKidId = data.memberId;
    newKidReg = data.id;
    expect(data.status).toBe("PENDING");
    const kid = await db.member.findUniqueOrThrow({ where: { id: newKidId }, include: { parentLinks: { include: { parent: true } } } });
    expect(kid).toMatchObject({ type: "CHILD", firstName: "Rayen", userId: null });
    expect(kid.parentLinks).toHaveLength(1);
    expect(kid.parentLinks[0]).toMatchObject({ isPrimary: true, relation: "FATHER", parent: { type: "PARENT", firstName: "Hédi", lastName: "Testeur", userId: null } });
    const reg = await db.tripRegistration.findUniqueOrThrow({ where: { id: newKidReg }, include: { invoice: true } });
    // No parental consent step for a manager-added registration.
    expect(reg.parentConsent).toBe(true);
    expect(reg.invoice).toMatchObject({ amount: 30_000, payerId: kid.parentLinks[0]!.parentId, childId: kid.id, tripId });
  });

  it("validates a new person and adds an existing kid", async () => {
    expect((await call("POST", `/trips/${tripId}/participants`, { token: T.manager, body: { firstName: "Sans", lastName: "Date" } })).status).toBe(400);
    const cands = await call("GET", `/trips/${tripId}/candidates?q=Gharbi`, { token: T.manager });
    const kid = (cands.body!.rows as { id: string; type: string }[]).find((c) => c.type === "kid")!;
    expect(kid).toBeTruthy();
    const r = await call("POST", `/trips/${tripId}/participants`, { token: T.manager, body: { memberId: kid.id } });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    existingReg = (r.body!.data as { id: string }).id;
    // Already on the list.
    expect((await call("POST", `/trips/${tripId}/participants`, { token: T.manager, body: { memberId: kid.id } })).body).toMatchObject({ ok: false, error: "errors.alreadyRegistered" });
  });

  it("records payments up to the remaining balance", async () => {
    const pay = (amount: string, method?: string) => call("POST", `/trips/${tripId}/participants/${newKidReg}/payments`, { token: T.manager, body: { amount, method } });
    expect((await pay("10")).status).toBe(200);
    const reg = await db.tripRegistration.findUniqueOrThrow({ where: { id: newKidReg }, include: { invoice: { include: { payments: true } } } });
    expect(reg.invoice!.status).toBe("PARTIALLY_PAID");
    const managerUser = await db.user.findUniqueOrThrow({ where: { email: "membre@onet-teboulba.tn" } });
    expect(reg.invoice!.payments[0]).toMatchObject({ amount: 10_000, method: "CASH", recordedById: managerUser.id, status: "COMPLETED" });
    expect((await pay("25")).body).toMatchObject({ ok: false, error: "errors.amountTooHigh" });
    expect((await pay("5", "ONLINE")).status).toBe(400);
    expect((await pay("20", "BANK_TRANSFER")).status).toBe(200);
    const after = await db.tripRegistration.findUniqueOrThrow({ where: { id: newKidReg }, include: { invoice: true } });
    expect(after.invoice!.status).toBe("PAID");
    expect(after.status).toBe("CONFIRMED");
    // Non-managers can't record payments.
    expect((await call("POST", `/trips/${tripId}/participants/${existingReg}/payments`, { token: T.monitor, body: { amount: "5" } })).status).toBe(403);
  });

  it("lists participants with phone, guardian, amounts and totals", async () => {
    const { rows, totals } = await participants();
    const kid = rows.find((r) => r.id === newKidReg)!;
    expect(kid).toMatchObject({ type: "kid", phone: "+216 52 000 111", guardian: { name: "Hédi Testeur" }, amountDue: 30_000, paid: 30_000, remaining: 0, status: "CONFIRMED" });
    expect(kid.methods.sort()).toEqual(["BANK_TRANSFER", "CASH"]);
    expect(totals).toMatchObject({ participants: 2, expected: 60_000, collected: 30_000, outstanding: 30_000 });
    expect(totals.byMethod).toEqual(expect.arrayContaining([{ method: "BANK_TRANSFER", amount: 20_000 }, { method: "CASH", amount: 10_000 }]));
  });

  it("removes a participant (registration and unpaid invoice cancelled)", async () => {
    const r = await call("DELETE", `/trips/${tripId}/participants/${existingReg}`, { token: T.manager });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const reg = await db.tripRegistration.findUniqueOrThrow({ where: { id: existingReg }, include: { invoice: true } });
    expect(reg.status).toBe("CANCELLED");
    expect(reg.invoice?.status).toBe("CANCELLED");
    expect((await participants()).totals).toMatchObject({ participants: 1, expected: 30_000, collected: 30_000, outstanding: 0 });
  });

  it("finalizing freezes the list and sends the report to the accountants", async () => {
    const r = await call("POST", `/trips/${tripId}/finalize`, { token: T.manager });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const trip = await db.trip.findUniqueOrThrow({ where: { id: tripId } });
    expect(trip.listClosedAt).toBeInstanceOf(Date);
    const accountant = await db.user.findUniqueOrThrow({ where: { email: "comptable@onet-teboulba.tn" } });
    const n = await db.notification.findFirst({ where: { userId: accountant.id, link: `/dashboard/trips/${tripId}/report` } });
    expect(n).toMatchObject({ type: "TRIP_REGISTRATION", readAt: null });
    expect(n!.title).toContain("Sortie test à Sousse");

    // Frozen: no more additions / removals, and no second finalization.
    const add = await call("POST", `/trips/${tripId}/participants`, { token: T.manager, body: { firstName: "Trop", lastName: "Tard", dateOfBirth: "2015-01-01" } });
    expect(add.body).toMatchObject({ ok: false, error: ERR.listClosed });
    expect((await call("DELETE", `/trips/${tripId}/participants/${newKidReg}`, { token: T.manager })).body).toMatchObject({ ok: false, error: ERR.listClosed });
    expect((await call("POST", `/trips/${tripId}/finalize`, { token: T.manager })).body).toMatchObject({ ok: false, error: ERR.listClosed });
    expect((await participants()).closed).toMatchObject({ by: "Amel Kefi" });
  });

  it("the report (JSON + CSV) is readable by managers and accountants only", async () => {
    const r = await call("GET", `/trips/${tripId}/report`, { token: T.accountant });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body).toMatchObject({ trip: { title: "Sortie test à Sousse", price: 30_000 }, finalized: { by: "Amel Kefi" }, totals: { participants: 1, expected: 30_000, collected: 30_000, outstanding: 0 } });
    expect((r.body!.participants as Row[]).map((p) => p.member.firstName)).toEqual(["Rayen"]);
    expect((r.body!.managers as { name: string }[]).map((m) => m.name)).toEqual(["Amel Kefi"]);
    expect((await call("GET", `/trips/${tripId}/report`, { token: T.manager })).status).toBe(200);
    expect((await call("GET", `/trips/${tripId}/report`, { token: T.monitor })).status).toBe(403);
    expect((await call("GET", `/trips/${tripId}/report`, { token: T.parent })).status).toBe(403);

    const csv = await fetch(`${base}/trips/${tripId}/report.csv`, { headers: { Authorization: `Bearer ${T.accountant}`, "X-Forwarded-For": "10.82.250.1" } });
    expect(csv.status).toBe(200);
    expect(csv.headers.get("content-type")).toContain("text/csv");
    const bytes = new Uint8Array(await csv.arrayBuffer());
    // UTF-8 BOM so Excel shows Arabic names correctly.
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain("Rayen Testeur");
    expect(text).toContain("30.000");
    expect((await call("GET", `/trips/${tripId}/report.csv`, { token: T.monitor })).status).toBe(403);
  });

  it("only admins reopen the list; managers can then edit it again", async () => {
    expect((await call("POST", `/trips/${tripId}/reopen`, { token: T.manager })).status).toBe(403);
    expect((await call("POST", `/trips/${tripId}/reopen`, { token: T.admin })).status).toBe(200);
    expect((await db.trip.findUniqueOrThrow({ where: { id: tripId } })).listClosedAt).toBeNull();
    const add = await call("POST", `/trips/${tripId}/participants`, { token: T.manager, body: { firstName: "Lina", lastName: "Testeur", dateOfBirth: "2014-09-01", phone: "+216 21 333 444" } });
    expect(add.status, JSON.stringify(add.body)).toBe(200);
    const row = (await participants()).rows.find((x) => x.member.firstName === "Lina")!;
    // No guardian given: the child is their own payer, their own phone is shown.
    expect(row).toMatchObject({ phone: "+216 21 333 444", guardian: null, remaining: 30_000 });
    expect((await call("POST", `/trips/${tripId}/reopen`, { token: T.admin })).body).toMatchObject({ ok: false, error: ERR.notClosed });
  });

  it("admins assign and remove trip managers (members, monitors or staff only)", async () => {
    const karim = await db.member.findFirstOrThrow({ where: { user: { email: "karim.jaziri@onet-teboulba.tn" } } });
    expect((await call("POST", `/trips/${tripId}/monitors`, { token: T.manager, body: { memberId: karim.id } })).status).toBe(403);
    expect((await call("POST", `/trips/${tripId}/monitors`, { token: T.admin, body: { memberId: karim.id } })).status).toBe(200);
    expect((await call("POST", `/trips/${tripId}/monitors`, { token: T.admin, body: { memberId: newKidId } })).status).toBe(400);
    // Karim now manages the trip.
    expect((await call("GET", `/trips/${tripId}/candidates`, { token: T.monitor })).status).toBe(200);
    expect((await call("DELETE", `/trips/${tripId}/monitors/${karim.id}`, { token: T.admin })).status).toBe(200);
    expect((await call("GET", `/trips/${tripId}/candidates`, { token: T.monitor })).status).toBe(403);
  });
});

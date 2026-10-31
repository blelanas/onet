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

let ipSeq = 0;
async function call(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
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
  return { status: res.status, body: text ? (superjson.parse(text) as Record<string, unknown>) : null };
}

async function login(email: string) {
  const r = await call("POST", "/auth/login", { body: { email, password: "Onet2026!" } });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body!.data as { token: string }).token;
}

type BureauRow = { id: string; name: string; nameAr: string | null; position: string; positionAr: string | null; photoUrl: string | null; isActive?: boolean; sortOrder?: number };
const publicBureau = async () => (await call("GET", "/public/bureau")).body!.rows as BureauRow[];

let admin = "";
let member = "";
beforeAll(async () => {
  admin = await login("gestion@onet-teboulba.tn"); // admin: content.manage
  member = await login("membre@onet-teboulba.tn");
});

describe("local bureau", () => {
  it("is public: active members only, in order, with Arabic and French fields", async () => {
    const hidden = await db.bureauMember.create({ data: { name: "Hidden Person", position: "Ancien membre", sortOrder: -5, isActive: false } });
    const rows = await publicBureau();
    expect(rows.length).toBeGreaterThanOrEqual(6);
    expect(rows.map((r) => r.id)).not.toContain(hidden.id);
    // Seeded order: the president first, then the vice-president…
    expect(rows[0]).toMatchObject({ name: "Samia Trabelsi", nameAr: "سامية الطرابلسي", position: "Présidente du bureau", positionAr: "رئيسة المكتب" });
    expect(rows[0].photoUrl).toMatch(/^\/demo\/bureau\/member-1\.svg$/);
    expect(rows[1].positionAr).toBe("نائب الرئيس");
    // No internal fields on the public endpoint.
    expect(Object.keys(rows[0]).sort()).toEqual(["id", "name", "nameAr", "photoUrl", "position", "positionAr"]);
    // The landing page ships the same list.
    const home = await call("GET", "/public/home");
    expect((home.body!.bureau as BureauRow[]).map((r) => r.id)).toEqual(rows.map((r) => r.id));
    await db.bureauMember.delete({ where: { id: hidden.id } });
  });

  it("is managed with content.manage only (a member gets 403)", async () => {
    const any = (await db.bureauMember.findFirstOrThrow()).id;
    expect((await call("GET", "/settings/bureau", { token: member })).status).toBe(403);
    expect((await call("POST", "/settings/bureau", { token: member, body: { name: "X", position: "Y" } })).status).toBe(403);
    expect((await call("POST", `/settings/bureau/${any}/move`, { token: member, body: { direction: "up" } })).status).toBe(403);
    expect((await call("DELETE", `/settings/bureau/${any}`, { token: member })).status).toBe(403);
    expect((await call("GET", "/settings/bureau")).status).toBe(401);
    expect((await call("GET", "/settings/bureau", { token: admin })).status).toBe(200);
  });

  it("admins add, edit, hide, reorder and delete members", async () => {
    // Created at the end of the list.
    const created = await call("POST", "/settings/bureau", { token: admin, body: { name: "Nour Kefi", nameAr: "نور الكافي", position: "Conseillère", positionAr: "مستشارة", photoUrl: "/demo/bureau/member-2.svg", isActive: true } });
    expect(created.body).toMatchObject({ ok: true });
    const id = (created.body!.data as { id: string }).id;
    let list = (await call("GET", "/settings/bureau", { token: admin })).body!.rows as BureauRow[];
    expect(list.at(-1)).toMatchObject({ id, name: "Nour Kefi", isActive: true });
    expect((await publicBureau()).at(-1)?.id).toBe(id);

    // Validation: required fields, uploaded or demo photos only.
    const bad = await call("POST", "/settings/bureau", { token: admin, body: { name: "", position: "P", photoUrl: "https://evil.example/x.png" } });
    expect(bad.status).toBe(400);
    expect((bad.body as { fieldErrors: Record<string, string> }).fieldErrors).toMatchObject({ name: "errors.required", photoUrl: "content.common.invalidUrl" });

    // Move up: swaps with the previous one; moving the first one up does nothing.
    const before = list.map((r) => r.id);
    expect((await call("POST", `/settings/bureau/${id}/move`, { token: admin, body: { direction: "up" } })).body).toMatchObject({ ok: true });
    list = (await call("GET", "/settings/bureau", { token: admin })).body!.rows as BureauRow[];
    expect(list.map((r) => r.id)).toEqual([...before.slice(0, -2), id, before.at(-2)]);
    expect(list.map((r) => r.sortOrder)).toEqual(list.map((_, i) => i));
    expect((await call("POST", `/settings/bureau/${list[0].id}/move`, { token: admin, body: { direction: "up" } })).body).toMatchObject({ ok: true });
    expect(((await call("GET", "/settings/bureau", { token: admin })).body!.rows as BureauRow[])[0].id).toBe(list[0].id);
    expect((await call("POST", `/settings/bureau/${id}/move`, { token: admin, body: { direction: "sideways" } })).status).toBe(400);
    expect((await call("POST", "/settings/bureau/nope/move", { token: admin, body: { direction: "down" } })).status).toBe(404);

    // Edit + hide: no longer on the public page.
    const edited = await call("POST", "/settings/bureau", { token: admin, body: { id, name: "Nour Kefi", nameAr: "", position: "Conseillère jeunesse", positionAr: "", photoUrl: "", isActive: false } });
    expect(edited.body).toMatchObject({ ok: true });
    expect(await db.bureauMember.findUniqueOrThrow({ where: { id } })).toMatchObject({ position: "Conseillère jeunesse", nameAr: null, photoUrl: null, isActive: false });
    expect((await publicBureau()).map((r) => r.id)).not.toContain(id);

    expect((await call("DELETE", `/settings/bureau/${id}`, { token: admin })).body).toMatchObject({ ok: true });
    expect(await db.bureauMember.findUnique({ where: { id } })).toBeNull();
    expect((await call("DELETE", `/settings/bureau/${id}`, { token: admin })).status).toBe(404);
  });
});

describe("dances", () => {
  type DanceRow = { id: string; title: string; category: string; ageGroup: string };

  it("members read the dances (list, filters, page with steps)", async () => {
    const list = await call("GET", "/content/dances", { token: member });
    expect(list.status).toBe(200);
    const rows = list.body!.rows as DanceRow[];
    expect(list.body).toMatchObject({ canManage: false, filtered: false });
    expect(rows.length).toBeGreaterThanOrEqual(5);

    const kids = (await call("GET", "/content/dances?category=KIDS", { token: member })).body!;
    expect((kids.rows as DanceRow[]).map((d) => d.title)).toContain("La danse des canards");
    expect((kids.rows as DanceRow[]).every((d) => d.category === "KIDS")).toBe(true);
    // An age group also lists the dances for all ages.
    const small = (await call("GET", "/content/dances?ageGroup=4-7", { token: member })).body!.rows as DanceRow[];
    expect(small.every((d) => d.ageGroup === "4-7" || d.ageGroup === "ALL")).toBe(true);
    expect(small.some((d) => d.ageGroup === "ALL")).toBe(true);
    const q = (await call("GET", `/content/dances?q=${encodeURIComponent("الدبكة")}`, { token: member })).body!.rows as DanceRow[];
    expect(q.map((d) => d.title)).toEqual(["رقصة الدبكة"]);

    const canards = (kids.rows as DanceRow[]).find((d) => d.title === "La danse des canards")!;
    const page = await call("GET", `/content/dances/${canards.id}`, { token: member });
    expect(page.status).toBe(200);
    expect((page.body!.steps as string[]).length).toBe(5);
    expect(page.body!.dance).toMatchObject({ category: "KIDS", imageUrl: "/demo/dances/dance-2.svg" });
    expect((await call("GET", "/content/dances/nope", { token: member })).status).toBe(404);
  });

  it("only content managers create, edit and delete them", async () => {
    const any = ((await call("GET", "/content/dances", { token: member })).body!.rows as DanceRow[])[0];
    expect((await call("GET", `/content/dances/${any.id}/form`, { token: member })).status).toBe(403);
    expect((await call("POST", "/content/dances", { token: member, body: { title: "X", category: "GROUP", ageGroup: "ALL" } })).status).toBe(403);
    expect((await call("DELETE", `/content/dances/${any.id}`, { token: member })).status).toBe(403);
    expect((await call("GET", "/content/dances")).status).toBe(401);
    // Every member reads the baggage (content.read).
    expect((await call("GET", "/content/dances", { token: await login("moniteur@onet-teboulba.tn") })).status).toBe(200);
  });

  it("admins create a dance with media, edit and delete it", async () => {
    const bad = await call("POST", "/content/dances", { token: admin, body: { title: "Bad", category: "DISCO", ageGroup: "ALL", videoLink: "javascript:alert(1)" } });
    expect(bad.status).toBe(400);
    expect(Object.keys((bad.body as { fieldErrors: Record<string, string> }).fieldErrors).sort()).toEqual(["category", "videoLink"]);

    const created = await call("POST", "/content/dances", {
      token: admin,
      body: {
        title: "Danse des drapeaux",
        description: "Pour la fête nationale.",
        steps: "1. On lève le drapeau\n\n- On tourne\n• On salue",
        category: "SHOW",
        ageGroup: "8-12",
        durationMin: "7",
        imageUrl: "/demo/dances/dance-5.svg",
        audioUrl: "/demo/audio/song-3.wav",
        videoLink: "https://www.youtube.com/watch?v=abc123",
        isPublic: true,
      },
    });
    expect(created.body).toMatchObject({ ok: true });
    const id = (created.body!.data as { id: string }).id;
    const page = await call("GET", `/content/dances/${id}`, { token: member });
    expect(page.body!.steps).toEqual(["On lève le drapeau", "On tourne", "On salue"]);
    expect(page.body!.dance).toMatchObject({ durationMin: 7, videoUrl: "https://www.youtube.com/watch?v=abc123", audioUrl: "/demo/audio/song-3.wav", isPublic: true });
    expect((await db.dance.findUniqueOrThrow({ where: { id } })).createdById).toBeTruthy();

    const form = await call("GET", `/content/dances/${id}/form`, { token: admin });
    expect(form.body!.dance).toMatchObject({ id, title: "Danse des drapeaux" });

    const edited = await call("POST", "/content/dances", { token: admin, body: { id, title: "Danse des drapeaux", category: "SHOW", ageGroup: "ALL", videoFile: "/api/files/abc", steps: "" } });
    expect(edited.body).toMatchObject({ ok: true });
    expect(await db.dance.findUniqueOrThrow({ where: { id } })).toMatchObject({ ageGroup: "ALL", videoUrl: "/api/files/abc", steps: null, imageUrl: null, isPublic: false });
    expect((await call("POST", "/content/dances", { token: admin, body: { id: "nope", title: "X", category: "SHOW", ageGroup: "ALL" } })).status).toBe(404);

    expect((await call("DELETE", `/content/dances/${id}`, { token: admin })).body).toMatchObject({ ok: true });
    expect((await call("GET", `/content/dances/${id}`, { token: member })).status).toBe(404);
    expect((await call("DELETE", `/content/dances/${id}`, { token: admin })).status).toBe(404);
  });
});

describe("member home", () => {
  it("members and monitors get the member flavour with editions, teams, managed trips, announcements and counts", async () => {
    const me = await db.member.findFirstOrThrow({ where: { user: { email: "membre@onet-teboulba.tn" } } });
    const day = 86400_000;
    const series = await db.eventSeries.create({ data: { name: "Tadhahorat Ettoufoula", nameAr: "تظاهرة الطفولة", kind: "FESTIVAL", color: "#12924A" } });
    const edition = await db.event.create({
      data: { title: "Tadhahorat Ettoufoula 16", category: "CHILDREN", startAt: new Date(Date.now() + 60_000), endAt: new Date(Date.now() + 3 * day), status: "PUBLISHED", seriesId: series.id, editionNumber: 16 },
    });
    const past = await db.event.create({
      data: { title: "Tadhahorat Ettoufoula 15", category: "CHILDREN", startAt: new Date(Date.now() - 400 * day), endAt: new Date(Date.now() - 397 * day), status: "COMPLETED", seriesId: series.id, editionNumber: 15 },
    });
    const team = await db.eventTeam.create({ data: { eventId: edition.id, name: "Les Hirondelles", color: "#FFB400", members: { create: [{ memberId: me.id }] } } });
    const led = await db.eventTeam.create({ data: { eventId: edition.id, name: "Les Dauphins", color: "#1E9BD7", leaderId: me.id } });
    await db.eventTeam.create({ data: { eventId: past.id, name: "Ancienne équipe", leaderId: me.id } });
    const trip = await db.trip.create({
      data: { title: "Sortie à Monastir", destination: "Monastir", category: "EXCURSION", departureLocation: "Teboulba", departAt: new Date(Date.now() + 2 * 3600_000), returnAt: new Date(Date.now() + 10 * 3600_000), status: "OPEN", monitors: { create: [{ memberId: me.id }] } },
    });

    const res = await call("GET", "/dashboard", { token: member });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ kind: "member" });
    const d = res.body!.data as {
      org: { name: string };
      firstName: string;
      editions: { id: string; series: { nameAr: string | null } | null; ongoing: boolean }[];
      teams: { id: string; name: string; isLeader: boolean; event: { title: string } }[];
      trips: { id: string }[];
      announcements: unknown[];
      unreadMessages: number;
      counts: { songs: number; dances: number; games: number };
    };
    expect(d.org.name).toBe("ONET Teboulba");
    expect(d.firstName).toBe("Amel");
    expect(d.editions.find((e) => e.id === edition.id)).toMatchObject({ series: { nameAr: "تظاهرة الطفولة" }, ongoing: false });
    expect(d.editions.map((e) => e.id)).not.toContain(past.id);
    // The seed also puts this member on other teams: only check the ones created here are listed.
    expect(d.teams.map((t) => t.id)).toEqual(expect.arrayContaining([team.id, led.id]));
    expect(d.teams.find((t) => t.id === led.id)).toMatchObject({ isLeader: true, event: { title: "Tadhahorat Ettoufoula 16" } });
    expect(d.teams.find((t) => t.id === team.id)).toMatchObject({ isLeader: false, animators: 1, kids: 0 });
    // The leader counts as an animator of the team.
    expect(d.teams.find((t) => t.id === led.id)).toMatchObject({ animators: 1 });
    expect(d.trips.map((t) => t.id)).toContain(trip.id);
    expect(d.announcements.length).toBeLessThanOrEqual(5);
    expect(typeof d.unreadMessages).toBe("number");
    expect(d.counts.dances).toBeGreaterThanOrEqual(5);
    expect(d.counts.songs).toBeGreaterThan(0);
    expect(d.counts.games).toBeGreaterThan(0);

    // Monitors share the member home; staff keep theirs.
    expect((await call("GET", "/dashboard", { token: await login("moniteur@onet-teboulba.tn") })).body).toMatchObject({ kind: "member" });
    expect((await call("GET", "/dashboard", { token: admin })).body).toMatchObject({ kind: "admin" });

    await db.trip.delete({ where: { id: trip.id } });
    await db.event.deleteMany({ where: { seriesId: series.id } });
    await db.eventSeries.delete({ where: { id: series.id } });
  });

  it("lists only the editions the member may see, never drafts, and counts the team's active kids", async () => {
    const me = await db.member.findFirstOrThrow({ where: { user: { email: "membre@onet-teboulba.tn" } } });
    const series = await db.eventSeries.create({ data: { name: "Série interne", kind: "CLUB" } });
    const soon = { category: "CHILDREN", startAt: new Date(Date.now() + 60_000), endAt: new Date(Date.now() + 3 * 86400_000), seriesId: series.id };
    const hidden = await db.event.create({ data: { ...soon, title: "Interne sans équipe", isPublic: false, editionNumber: 1 } });
    const mine = await db.event.create({ data: { ...soon, title: "Interne avec équipe", isPublic: false, editionNumber: 2 } });
    const draft = await db.event.create({ data: { ...soon, title: "Brouillon", status: "DRAFT", editionNumber: 3 } });
    const team = await db.eventTeam.create({ data: { eventId: mine.id, name: "Équipe interne", leaderId: me.id } });
    const draftTeam = await db.eventTeam.create({ data: { eventId: draft.id, name: "Équipe brouillon", leaderId: me.id } });
    // One active kid counts; a cancelled kid and an adult on the team don't.
    const [k1, k2] = await db.member.findMany({ where: { type: "CHILD" }, take: 2 });
    const adult = await db.member.findFirstOrThrow({ where: { type: "MEMBER", id: { not: me.id } } });
    await db.eventRegistration.createMany({
      data: [
        { eventId: mine.id, memberId: k1!.id, status: "CONFIRMED", teamId: team.id },
        { eventId: mine.id, memberId: k2!.id, status: "CANCELLED", teamId: team.id },
        { eventId: mine.id, memberId: adult.id, status: "CONFIRMED", teamId: team.id },
      ],
    });
    try {
      const d = (await call("GET", "/dashboard", { token: member })).body!.data as { editions: { id: string }[]; teams: { id: string; kids: number }[] };
      const editions = d.editions.map((e) => e.id);
      expect(editions).toContain(mine.id);
      expect(editions).not.toContain(hidden.id);
      expect(editions).not.toContain(draft.id);
      expect(d.teams.map((t) => t.id)).not.toContain(draftTeam.id);
      expect(d.teams.find((t) => t.id === team.id)).toMatchObject({ kids: 1 });
    } finally {
      await db.event.deleteMany({ where: { seriesId: series.id } });
      await db.eventSeries.delete({ where: { id: series.id } });
    }
  });

  it("a member (Member.type MEMBER) creates an activity and leads it; members are monitor options", async () => {
    const me = await db.member.findFirstOrThrow({ where: { user: { email: "membre@onet-teboulba.tn" } } });
    expect(me.type).toBe("MEMBER");
    const r = await call("POST", "/activities", { token: member, body: { title: "Atelier test", category: "GAMES", durationMin: 60, capacity: 12, status: "ACTIVE" } });
    expect(r.body, JSON.stringify(r.body)).toMatchObject({ ok: true });
    const id = (r.body!.data as { id: string }).id;
    expect(await db.activity.findUniqueOrThrow({ where: { id } })).toMatchObject({ monitorId: me.id });
    const opts = await call("GET", "/activities/form-options", { token: admin });
    expect(JSON.stringify(opts.body)).toContain(me.id);
    await db.activity.delete({ where: { id } });
  });

  it("seeded members carry their occupation and date of birth", async () => {
    const amel = await db.member.findFirstOrThrow({ where: { user: { email: "membre@onet-teboulba.tn" } } });
    expect(amel).toMatchObject({ occupation: "WORKER", occupationDetail: expect.stringContaining("Institutrice") });
    expect(amel.dateOfBirth).toBeInstanceOf(Date);
    // Every seeded member / monitor (other tests add their own records).
    expect(await db.member.count({ where: { type: { in: ["MEMBER", "MONITOR"] }, email: { endsWith: "@onet-teboulba.tn" }, OR: [{ occupation: null }, { dateOfBirth: null }] } })).toBe(0);
    // Seeded sign-ups waiting for approval request the member role and show their answers.
    const pending = (await call("GET", "/approvals/pending", { token: admin })).body!.rows as { email: string; requestedRole: string; age: number | null; occupation: string | null }[];
    expect(pending.find((r) => r.email === "rania.ferchichi@example.tn")).toMatchObject({ requestedRole: "member", age: 19, occupation: "STUDENT" });
  });
});

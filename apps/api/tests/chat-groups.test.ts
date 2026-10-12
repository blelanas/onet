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
      "X-Forwarded-For": `10.81.${Math.floor(ipSeq / 250)}.${ipSeq % 250}`,
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

const userId = async (email: string) => (await db.user.findUniqueOrThrow({ where: { email } })).id;
const ERR = fr.communication.messages.groups.errors;

type Thread = {
  id: string;
  kind: string;
  title: string;
  isParticipant: boolean;
  isAdmin: boolean;
  canManage: boolean;
  canLeave: boolean;
  participants: { userId: string; name: string; isAdmin: boolean }[];
  messages: { body: string; sender: { name: string } }[];
  team: { eventId: string; teamName: string; editionTitle: string } | null;
};
type Summary = { id: string; kind: string; title: string; participantsCount: number; isAdmin: boolean; unread: number; team: Thread["team"]; last: { senderName: string } | null };

const T: Record<string, string> = {};
const U: Record<string, string> = {};
beforeAll(async () => {
  for (const [k, email] of Object.entries({
    member: "membre@onet-teboulba.tn",
    monitor: "moniteur@onet-teboulba.tn",
    karim: "karim.jaziri@onet-teboulba.tn",
    ines: "ines.bouzid@onet-teboulba.tn",
    parent: "parent@onet-teboulba.tn",
    admin: "gestion@onet-teboulba.tn",
  })) {
    T[k] = await login(email);
    U[k] = await userId(email);
  }
});

const thread = async (token: string, id: string) => {
  const r = await call("GET", `/messages?c=${id}`, { token });
  return { status: r.status, thread: r.body?.thread as Thread | null, canReply: r.body?.canReply as boolean };
};

describe("contacts", () => {
  it("members and monitors reach each other and the staff, but not parents of other groups", async () => {
    const r = await call("GET", "/messages", { token: T.member });
    const contacts = (r.body!.contacts as { id: string; kind: string }[]).map((c) => c.id);
    expect(contacts).toEqual(expect.arrayContaining([U.monitor, U.karim, U.ines, U.admin]));
    expect(contacts).not.toContain(U.parent);
    // Pending sign-ups are never contacts.
    const pending = await db.user.findMany({ where: { status: "PENDING" }, select: { id: true } });
    for (const p of pending) expect(contacts).not.toContain(p.id);
  });
});

describe("chat groups", () => {
  let groupId = "";

  it("refuses non-contacts and validates the name", async () => {
    expect((await call("POST", "/messages/groups", { token: T.member, body: { title: "Test", userIds: [U.monitor, U.parent] } })).status).toBe(403);
    expect((await call("POST", "/messages/groups", { token: T.member, body: { title: "", userIds: [U.monitor] } })).status).toBe(400);
    expect((await call("POST", "/messages/groups", { token: T.member, body: { title: "x".repeat(81), userIds: [U.monitor] } })).status).toBe(400);
    expect((await call("POST", "/messages/groups", { token: T.member, body: { title: "Vide", userIds: [] } })).status).toBe(400);
  });

  it("creates a group: the creator is admin, the others are notified", async () => {
    const r = await call("POST", "/messages/groups", { token: T.member, body: { title: "Atelier théâtre", userIds: [U.monitor, U.karim] } });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    groupId = (r.body!.data as { id: string }).id;
    const { thread: th, canReply } = await thread(T.member, groupId);
    expect(th).toMatchObject({ kind: "GROUP", title: "Atelier théâtre", isAdmin: true, canManage: true, canLeave: true, team: null });
    expect(th!.participants).toHaveLength(3);
    expect(canReply).toBe(true);
    expect(await db.notification.count({ where: { userId: U.monitor, type: "MESSAGE", readAt: null, link: `/dashboard/messages?c=${groupId}` } })).toBe(1);

    const list = await call("GET", "/messages", { token: T.monitor });
    const summary = (list.body!.conversations as Summary[]).find((c) => c.id === groupId);
    expect(summary).toMatchObject({ kind: "GROUP", title: "Atelier théâtre", participantsCount: 3, isAdmin: false });
  });

  it("only participants open or post in a group", async () => {
    expect((await thread(T.parent, groupId)).status).toBe(404);
    expect((await call("POST", "/messages", { token: T.parent, body: { conversationId: groupId, body: "Bonjour" } })).status).toBe(404);
    expect((await call("POST", "/messages", { token: T.ines, body: { conversationId: groupId, body: "Bonjour" } })).status).toBe(404);
  });

  it("non-admins can't manage the group", async () => {
    const { thread: th } = await thread(T.monitor, groupId);
    expect(th).toMatchObject({ isAdmin: false, canManage: false });
    expect((await call("POST", `/messages/groups/${groupId}`, { token: T.monitor, body: { title: "Renamed" } })).status).toBe(403);
  });

  it("admins rename, add, remove and promote", async () => {
    const r = await call("POST", `/messages/groups/${groupId}`, { token: T.member, body: { title: "Théâtre & chant", addUserIds: [U.ines], removeUserIds: [U.karim], makeAdminIds: [U.monitor] } });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const { thread: th } = await thread(T.member, groupId);
    expect(th!.title).toBe("Théâtre & chant");
    expect(th!.participants.map((p) => p.userId).sort()).toEqual([U.member, U.monitor, U.ines].sort());
    expect(th!.participants.find((p) => p.userId === U.monitor)?.isAdmin).toBe(true);
    // Removed people lose access; adding a non-contact is refused.
    expect((await thread(T.karim, groupId)).status).toBe(404);
    expect((await call("POST", `/messages/groups/${groupId}`, { token: T.member, body: { addUserIds: [U.parent] } })).status).toBe(403);
    // Only current members can be made admin.
    const bad = await call("POST", `/messages/groups/${groupId}`, { token: T.member, body: { makeAdminIds: [U.karim] } });
    expect(bad.body).toMatchObject({ ok: false, error: ERR.notMember });
  });

  it("keeps one unread MESSAGE notification per conversation per user", async () => {
    const link = `/dashboard/messages?c=${groupId}`;
    for (const body of ["Premier message", "Deuxième message", "Troisième message"]) {
      expect((await call("POST", "/messages", { token: T.member, body: { conversationId: groupId, body } })).status).toBe(200);
    }
    const unread = await db.notification.findMany({ where: { userId: U.ines, type: "MESSAGE", readAt: null, link } });
    expect(unread).toHaveLength(1);
    expect(unread[0]!.body).toBe("Troisième message");
    // Opening the thread reads it; the next message creates a fresh one.
    const { thread: th } = await thread(T.ines, groupId);
    expect(th!.messages.at(-1)).toMatchObject({ body: "Troisième message", sender: { name: "Amel Kefi" } });
    expect(await db.notification.count({ where: { userId: U.ines, type: "MESSAGE", readAt: null, link } })).toBe(0);
    await call("POST", "/messages", { token: T.monitor, body: { conversationId: groupId, body: "Quatrième" } });
    expect(await db.notification.count({ where: { userId: U.ines, type: "MESSAGE", readAt: null, link } })).toBe(1);
    const list = await call("GET", "/messages", { token: T.ines });
    expect((list.body!.conversations as Summary[]).find((c) => c.id === groupId)).toMatchObject({ unread: 1, last: { senderName: "Yasmine Trabelsi" } });
  });

  it("members leave; the group keeps an admin", async () => {
    expect((await call("POST", `/messages/groups/${groupId}/leave`, { token: T.member })).status).toBe(200);
    expect((await thread(T.member, groupId)).status).toBe(404);
    const { thread: th } = await thread(T.monitor, groupId);
    expect(th!.participants).toHaveLength(2);
    expect(th!.participants.some((p) => p.isAdmin)).toBe(true);
    // Leaving twice: not a participant any more.
    expect((await call("POST", `/messages/groups/${groupId}/leave`, { token: T.member })).status).toBe(404);
  });

  it("a group of two is not reused as the direct thread", async () => {
    const g = await call("POST", "/messages/groups", { token: T.member, body: { title: "Binôme", userIds: [U.karim] } });
    const gid = (g.body!.data as { id: string }).id;
    const direct = await call("POST", "/messages/conversations", { token: T.member, body: { to: U.karim, body: "Salut Karim" } });
    expect(direct.status).toBe(200);
    expect((direct.body!.data as { id: string }).id).not.toBe(gid);
  });

  it("platform admins list every group, open it read-only and manage it", async () => {
    expect((await call("GET", "/messages/groups/all", { token: T.member })).status).toBe(403);
    const all = await call("GET", "/messages/groups/all", { token: T.admin });
    expect((all.body!.rows as { id: string }[]).some((r) => r.id === groupId)).toBe(true);
    const { thread: th, canReply } = await thread(T.admin, groupId);
    expect(th).toMatchObject({ isParticipant: false, canManage: true, canLeave: false });
    expect(canReply).toBe(false);
    expect((await call("POST", `/messages/groups/${groupId}`, { token: T.admin, body: { title: "Théâtre (modéré)" } })).status).toBe(200);
    expect((await call("POST", "/messages", { token: T.admin, body: { conversationId: groupId, body: "Hello" } })).status).toBe(404);
  });
});

describe("team chats", () => {
  it("are listed with their team and refuse renaming, membership edits and leaving", async () => {
    const event = await db.event.create({ data: { title: "Festival de l'enfance 16", category: "CHILDREN", startAt: new Date(Date.now() + 20 * 86400_000), endAt: new Date(Date.now() + 21 * 86400_000) } });
    const conv = await db.conversation.create({
      data: { kind: "GROUP", subject: "Équipe Soleil", participants: { create: [{ userId: U.member, isAdmin: true }, { userId: U.monitor }] } },
    });
    await db.eventTeam.create({ data: { eventId: event.id, name: "Équipe Soleil", conversationId: conv.id } });

    const list = await call("GET", "/messages", { token: T.member });
    const s = (list.body!.conversations as Summary[]).find((c) => c.id === conv.id);
    expect(s).toMatchObject({ kind: "GROUP", title: "Équipe Soleil", team: { eventId: event.id, teamName: "Équipe Soleil", editionTitle: "Festival de l'enfance 16" } });
    const { thread: th, canReply } = await thread(T.member, conv.id);
    expect(th).toMatchObject({ canManage: false, canLeave: false });
    expect(canReply).toBe(true);

    for (const body of [{ title: "Autre nom" }, { addUserIds: [U.karim] }, { removeUserIds: [U.monitor] }]) {
      const r = await call("POST", `/messages/groups/${conv.id}`, { token: T.member, body });
      expect(r.status).toBe(400);
      expect(r.body).toMatchObject({ ok: false, error: ERR.teamManaged });
    }
    expect((await call("POST", `/messages/groups/${conv.id}/leave`, { token: T.member })).body).toMatchObject({ ok: false, error: ERR.teamManaged });
    // Posting works like any group.
    expect((await call("POST", "/messages", { token: T.monitor, body: { conversationId: conv.id, body: "On se retrouve à 9h" } })).status).toBe(200);
  });
});

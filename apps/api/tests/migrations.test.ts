import { describe, expect, it } from "vitest";
import { createClient } from "@libsql/client";
import { mkdtempSync, readFileSync } from "fs";
import os from "os";
import path from "path";

const sql = (name: string) => readFileSync(path.join(__dirname, "..", "prisma", "migrations", name), "utf8");

describe("migrations", () => {
  it("0002 grants users.approve to super_admin and admin on a database that already has roles", async () => {
    const file = path.join(mkdtempSync(path.join(os.tmpdir(), "onet-mig-")), "m.db");
    const client = createClient({ url: `file:${file}` });
    try {
      await client.executeMultiple(sql("0001_init.sql"));
      // A production database at 0001: roles and permissions created by an earlier seed.
      await client.executeMultiple(`
        INSERT INTO "Role" ("id", "key", "name") VALUES ('r_sa', 'super_admin', 'SA'), ('r_ad', 'admin', 'Admin'), ('r_mo', 'monitor', 'Moniteur');
        INSERT INTO "Permission" ("id", "key", "module") VALUES ('p_ur', 'users.read', 'users');
        INSERT INTO "RolePermission" ("roleId", "permissionId") VALUES ('r_sa', 'p_ur'), ('r_ad', 'p_ur');
      `);
      const grants = async () =>
        (
          await client.execute(
            `SELECT r."key" FROM "RolePermission" rp JOIN "Role" r ON r."id" = rp."roleId" JOIN "Permission" p ON p."id" = rp."permissionId" WHERE p."key" = 'users.approve' ORDER BY r."key"`,
          )
        ).rows.map((r) => r.key);
      await client.executeMultiple(sql("0002_self_signup.sql"));
      expect(await grants()).toEqual(["admin", "super_admin"]);
      const perm = (await client.execute(`SELECT "module" FROM "Permission" WHERE "key" = 'users.approve'`)).rows;
      expect(perm).toEqual([expect.objectContaining({ module: "users" })]);
      // The data statements are idempotent.
      const full = sql("0002_self_signup.sql");
      const data = full.slice(full.indexOf(`INSERT OR IGNORE INTO "Permission"`));
      await client.executeMultiple(data);
      expect(await grants()).toEqual(["admin", "super_admin"]);
      expect((await client.execute(`SELECT count(*) AS n FROM "Permission" WHERE "key" = 'users.approve'`)).rows[0].n).toBe(1);
    } finally {
      client.close();
    }
  });

  it("0003 keeps existing events, registrations, conversations and messages (ADD COLUMN only, foreign keys on)", async () => {
    const file = path.join(mkdtempSync(path.join(os.tmpdir(), "onet-mig-")), "m.db");
    const client = createClient({ url: `file:${file}` });
    try {
      await client.executeMultiple(sql("0001_init.sql"));
      await client.executeMultiple(sql("0002_self_signup.sql"));
      await client.executeMultiple(`
        INSERT INTO "User" ("id", "email", "passwordHash", "name", "updatedAt") VALUES ('u1', 'a@x.tn', 'h', 'A', CURRENT_TIMESTAMP), ('u2', 'b@x.tn', 'h', 'B', CURRENT_TIMESTAMP);
        INSERT INTO "Member" ("id", "type", "firstName", "lastName", "membershipNumber", "updatedAt") VALUES ('m1', 'CHILD', 'K', 'Id', 'ONT-0001', CURRENT_TIMESTAMP);
        INSERT INTO "Event" ("id", "title", "category", "startAt", "endAt", "updatedAt") VALUES ('e1', 'Fête', 'CHILDREN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        INSERT INTO "EventRegistration" ("id", "eventId", "memberId", "updatedAt") VALUES ('r1', 'e1', 'm1', CURRENT_TIMESTAMP);
        INSERT INTO "Conversation" ("id", "updatedAt") VALUES ('c1', CURRENT_TIMESTAMP);
        INSERT INTO "ConversationParticipant" ("conversationId", "userId") VALUES ('c1', 'u1'), ('c1', 'u2');
        INSERT INTO "Message" ("id", "conversationId", "senderId", "body") VALUES ('msg1', 'c1', 'u1', 'Salut');
      `);
      // Like scripts/migrate.mjs: foreign keys enforced, the whole file in one write transaction.
      await client.execute("PRAGMA foreign_keys = ON");
      const tx = await client.transaction("write");
      await tx.executeMultiple(sql("0003_members_platform.sql"));
      await tx.commit();
      const count = async (t: string) => Number((await client.execute(`SELECT count(*) AS n FROM "${t}"`)).rows[0].n);
      for (const [t, n] of [["Event", 1], ["EventRegistration", 1], ["Conversation", 1], ["ConversationParticipant", 2], ["Message", 1], ["Member", 1], ["User", 2]] as const)
        expect(await count(t)).toBe(n);
      expect((await client.execute(`SELECT "kind" FROM "Conversation"`)).rows[0].kind).toBe("DIRECT");
      expect((await client.execute(`SELECT "seriesId", "teamId" FROM "Event" JOIN "EventRegistration" ON 1`)).rows[0]).toMatchObject({ seriesId: null, teamId: null });
      // The new foreign keys work: an edition can point at a series, a registration at a team.
      await client.executeMultiple(`
        INSERT INTO "EventSeries" ("id", "name", "updatedAt") VALUES ('s1', 'Festival', CURRENT_TIMESTAMP);
        UPDATE "Event" SET "seriesId" = 's1', "editionNumber" = 16, "seasonYear" = 2026;
        INSERT INTO "EventTeam" ("id", "eventId", "name", "updatedAt") VALUES ('t1', 'e1', 'Étoiles', CURRENT_TIMESTAMP);
        UPDATE "EventRegistration" SET "teamId" = 't1';
        DELETE FROM "EventTeam";
      `);
      expect((await client.execute(`SELECT "teamId" FROM "EventRegistration"`)).rows[0].teamId).toBeNull();
      // One edition number per series; events outside a series (NULLs) never clash.
      const event = (id: string, series: string | null, n: number | null) =>
        `INSERT INTO "Event" ("id", "title", "category", "startAt", "endAt", "updatedAt", "seriesId", "editionNumber") VALUES ('${id}', 'E', 'CHILDREN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ${series ? `'${series}'` : "NULL"}, ${n ?? "NULL"})`;
      await expect(client.execute(event("e2", "s1", 16))).rejects.toThrow(/UNIQUE/);
      await client.executeMultiple(`${event("e3", "s1", 17)}; ${event("e4", null, null)}; ${event("e5", null, null)}; ${event("e6", null, 16)};`);
      expect(await count("Event")).toBe(5);
    } finally {
      client.close();
    }
  });

  it("0005 turns monitors into members and closes parent / kid only accounts", async () => {
    const file = path.join(mkdtempSync(path.join(os.tmpdir(), "onet-mig-")), "m.db");
    const client = createClient({ url: `file:${file}` });
    try {
      for (const m of ["0001_init.sql", "0002_self_signup.sql", "0003_members_platform.sql"]) await client.executeMultiple(sql(m));
      await client.executeMultiple(`
        INSERT INTO "Role" ("id", "key", "name") VALUES ('r_mo', 'monitor', 'Moniteur'), ('r_me', 'member', 'Membre'), ('r_pa', 'parent', 'Parent'), ('r_ki', 'kid', 'Enfant'), ('r_ac', 'accountant', 'Comptable');
        INSERT INTO "User" ("id", "email", "passwordHash", "name", "updatedAt", "requestedRole") VALUES
          ('u_mo', 'mo@x.tn', 'h', 'Monitor', CURRENT_TIMESTAMP, NULL),
          ('u_both', 'both@x.tn', 'h', 'Monitor and member', CURRENT_TIMESTAMP, NULL),
          ('u_pa', 'pa@x.tn', 'h', 'Parent', CURRENT_TIMESTAMP, NULL),
          ('u_ki', 'ki@x.tn', 'h', 'Kid', CURRENT_TIMESTAMP, NULL),
          ('u_pa_acc', 'paacc@x.tn', 'h', 'Parent and accountant', CURRENT_TIMESTAMP, NULL),
          ('u_pend', 'pend@x.tn', 'h', 'Pending', CURRENT_TIMESTAMP, 'monitor');
        INSERT INTO "UserRole" ("userId", "roleId") VALUES ('u_mo', 'r_mo'), ('u_both', 'r_mo'), ('u_both', 'r_me'), ('u_pa', 'r_pa'), ('u_ki', 'r_ki'), ('u_pa_acc', 'r_pa'), ('u_pa_acc', 'r_ac');
        INSERT INTO "Session" ("id", "tokenHash", "userId", "expiresAt") VALUES ('s1', 't1', 'u_pa', CURRENT_TIMESTAMP), ('s2', 't2', 'u_mo', CURRENT_TIMESTAMP);
        INSERT INTO "Invitation" ("id", "tokenHash", "role", "expiresAt") VALUES ('i1', 'h1', 'monitor', CURRENT_TIMESTAMP);
        INSERT INTO "PreapprovedPerson" ("id", "name", "role") VALUES ('p1', 'P', 'monitor');
      `);
      await client.execute("PRAGMA foreign_keys = ON");
      const tx = await client.transaction("write");
      await tx.executeMultiple(sql("0005_account_roles.sql"));
      await tx.commit();
      const roles = async (u: string) =>
        (await client.execute({ sql: `SELECT r."key" FROM "UserRole" ur JOIN "Role" r ON r."id" = ur."roleId" WHERE ur."userId" = ? ORDER BY r."key"`, args: [u] })).rows.map((r) => r.key);
      expect(await roles("u_mo")).toEqual(["member"]);
      expect(await roles("u_both")).toEqual(["member"]);
      expect(await roles("u_pa_acc")).toEqual(["accountant"]);
      expect(await roles("u_pa")).toEqual(["parent"]);
      const active = async (u: string) => Number((await client.execute({ sql: `SELECT "isActive" FROM "User" WHERE "id" = ?`, args: [u] })).rows[0].isActive);
      expect([await active("u_mo"), await active("u_pa"), await active("u_ki"), await active("u_pa_acc")]).toEqual([1, 0, 0, 1]);
      expect((await client.execute(`SELECT "userId" FROM "Session"`)).rows.map((r) => r.userId)).toEqual(["u_mo"]);
      expect((await client.execute(`SELECT "role" FROM "Invitation"`)).rows[0].role).toBe("member");
      expect((await client.execute(`SELECT "role" FROM "PreapprovedPerson"`)).rows[0].role).toBe("member");
      expect((await client.execute(`SELECT "requestedRole" FROM "User" WHERE "id" = 'u_pend'`)).rows[0].requestedRole).toBe("member");
      // Idempotent: running it again changes nothing.
      await client.executeMultiple(sql("0005_account_roles.sql"));
      expect(await roles("u_both")).toEqual(["member"]);
    } finally {
      client.close();
    }
  });

  it("0004 adds the event director without touching events, teams or registrations; deleting the member clears it", async () => {
    const file = path.join(mkdtempSync(path.join(os.tmpdir(), "onet-mig-")), "m.db");
    const client = createClient({ url: `file:${file}` });
    try {
      for (const f of ["0001_init.sql", "0002_self_signup.sql", "0003_members_platform.sql"]) await client.executeMultiple(sql(f));
      await client.executeMultiple(`
        INSERT INTO "Member" ("id", "type", "firstName", "lastName", "membershipNumber", "updatedAt") VALUES ('k1', 'CHILD', 'K', 'Id', 'ONT-0001', CURRENT_TIMESTAMP), ('m1', 'MONITOR', 'Hela', 'D', 'ONT-0002', CURRENT_TIMESTAMP);
        INSERT INTO "Event" ("id", "title", "category", "startAt", "endAt", "updatedAt") VALUES ('e1', 'Fête', 'CHILDREN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        INSERT INTO "EventTeam" ("id", "eventId", "name", "leaderId", "updatedAt") VALUES ('t1', 'e1', 'Étoiles', 'm1', CURRENT_TIMESTAMP);
        INSERT INTO "EventRegistration" ("id", "eventId", "memberId", "teamId", "updatedAt") VALUES ('r1', 'e1', 'k1', 't1', CURRENT_TIMESTAMP);
      `);
      // Like scripts/migrate.mjs: foreign keys enforced, the whole file in one write transaction.
      await client.execute("PRAGMA foreign_keys = ON");
      const tx = await client.transaction("write");
      await tx.executeMultiple(sql("0004_event_director.sql"));
      await tx.commit();
      const count = async (t: string) => Number((await client.execute(`SELECT count(*) AS n FROM "${t}"`)).rows[0].n);
      for (const [t, n] of [["Event", 1], ["EventTeam", 1], ["EventRegistration", 1], ["Member", 2]] as const) expect(await count(t)).toBe(n);
      expect((await client.execute(`SELECT "directorId" FROM "Event"`)).rows[0].directorId).toBeNull();
      await client.execute(`UPDATE "Event" SET "directorId" = 'm1'`);
      await expect(client.execute(`UPDATE "Event" SET "directorId" = 'missing'`)).rejects.toThrow(/FOREIGN KEY/);
      await client.execute(`DELETE FROM "Member" WHERE "id" = 'm1'`);
      expect((await client.execute(`SELECT "directorId" FROM "Event"`)).rows[0].directorId).toBeNull();
      expect(await count("EventRegistration")).toBe(1);
    } finally {
      client.close();
    }
  });

  it("0006 adds the event frequency without touching events, teams, registrations or attendance; clubs weekly, festivals daily", async () => {
    const file = path.join(mkdtempSync(path.join(os.tmpdir(), "onet-mig-")), "m.db");
    const client = createClient({ url: `file:${file}` });
    try {
      for (const f of ["0001_init.sql", "0002_self_signup.sql", "0003_members_platform.sql", "0004_event_director.sql", "0005_account_roles.sql"]) await client.executeMultiple(sql(f));
      const event = (id: string, series: string | null) =>
        `INSERT INTO "Event" ("id", "title", "category", "startAt", "endAt", "updatedAt", "seriesId") VALUES ('${id}', 'E', 'CHILDREN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ${series ? `'${series}'` : "NULL"});`;
      await client.executeMultiple(`
        INSERT INTO "Member" ("id", "type", "firstName", "lastName", "membershipNumber", "updatedAt") VALUES ('k1', 'CHILD', 'K', 'Id', 'ONT-0001', CURRENT_TIMESTAMP), ('m1', 'MONITOR', 'Hela', 'D', 'ONT-0002', CURRENT_TIMESTAMP);
        INSERT INTO "EventSeries" ("id", "name", "kind", "updatedAt") VALUES ('club', 'Club', 'CLUB', CURRENT_TIMESTAMP), ('fest', 'Festival', 'FESTIVAL', CURRENT_TIMESTAMP), ('other', 'Autre', 'OTHER', CURRENT_TIMESTAMP);
        ${event("e_club", "club")} ${event("e_fest", "fest")} ${event("e_other", "other")} ${event("e_one", null)}
        UPDATE "Event" SET "directorId" = 'm1' WHERE "id" = 'e_club';
        INSERT INTO "EventTeam" ("id", "eventId", "name", "leaderId", "updatedAt") VALUES ('t1', 'e_club', 'Étoiles', 'm1', CURRENT_TIMESTAMP);
        INSERT INTO "EventRegistration" ("id", "eventId", "memberId", "teamId", "updatedAt") VALUES ('r1', 'e_club', 'k1', 't1', CURRENT_TIMESTAMP);
        INSERT INTO "Attendance" ("id", "date", "status", "memberId", "eventId", "contextKey", "updatedAt") VALUES ('a1', CURRENT_TIMESTAMP, 'PRESENT', 'k1', 'e_club', 'event:e_club', CURRENT_TIMESTAMP);
      `);
      // Like scripts/migrate.mjs: foreign keys enforced, the whole file in one write transaction.
      await client.execute("PRAGMA foreign_keys = ON");
      const tx = await client.transaction("write");
      await tx.executeMultiple(sql("0006_event_frequency.sql"));
      await tx.commit();
      const count = async (t: string) => Number((await client.execute(`SELECT count(*) AS n FROM "${t}"`)).rows[0].n);
      for (const [t, n] of [["Event", 4], ["EventSeries", 3], ["EventTeam", 1], ["EventRegistration", 1], ["Attendance", 1], ["Member", 2]] as const) expect(await count(t)).toBe(n);
      const freq = Object.fromEntries((await client.execute(`SELECT "id", "frequency" FROM "Event" ORDER BY "id"`)).rows.map((r) => [r.id, r.frequency]));
      expect(freq).toEqual({ e_club: "WEEKLY", e_fest: "DAILY", e_one: "ONCE", e_other: "ONCE" });
      expect((await client.execute(`SELECT "directorId", "seriesId" FROM "Event" WHERE "id" = 'e_club'`)).rows[0]).toMatchObject({ directorId: "m1", seriesId: "club" });
      expect((await client.execute(`SELECT "teamId" FROM "EventRegistration"`)).rows[0].teamId).toBe("t1");
      // New events get the default.
      await client.execute(event("e_new", null));
      expect((await client.execute(`SELECT "frequency" FROM "Event" WHERE "id" = 'e_new'`)).rows[0].frequency).toBe("ONCE");
    } finally {
      client.close();
    }
  });
});

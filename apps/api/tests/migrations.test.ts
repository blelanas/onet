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
    } finally {
      client.close();
    }
  });
});

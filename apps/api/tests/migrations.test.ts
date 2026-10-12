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
});

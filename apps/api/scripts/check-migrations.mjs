// Fails when prisma/schema.prisma has changes that no SQL migration covers.
// Builds a throwaway database from prisma/migrations/*.sql, then diffs it with the schema.
import { createClient } from "@libsql/client";
import { execFileSync } from "child_process";
import { mkdtempSync, readdirSync, readFileSync } from "fs";
import os from "os";
import path from "path";

const dir = path.join(process.cwd(), "prisma", "migrations");
const file = path.join(mkdtempSync(path.join(os.tmpdir(), "onet-drift-")), "drift.db");
const client = createClient({ url: `file:${file}` });
for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) await client.executeMultiple(readFileSync(path.join(dir, f), "utf8"));
client.close();
// `migrate diff --to-schema-datamodel` doesn't connect to the datasource today, but the schema's
// url = env("DATABASE_URL") must stay resolvable (and must never point at a real database here).
const prismaEnv = { ...process.env, DATABASE_URL: `file:${file}` };
try {
  execFileSync("npx", ["prisma", "migrate", "diff", "--from-url", `file:${file}`, "--to-schema-datamodel", "prisma/schema.prisma", "--exit-code"], { stdio: "pipe", env: prismaEnv });
  console.log("✓ migrations match the Prisma schema");
} catch (e) {
  if (e.status === 2) {
    const sql = execFileSync("npx", ["prisma", "migrate", "diff", "--from-url", `file:${file}`, "--to-schema-datamodel", "prisma/schema.prisma", "--script"], { env: prismaEnv }).toString();
    console.error("✗ prisma/schema.prisma has changes without a migration. Add prisma/migrations/000N_<name>.sql with:\n\n" + sql);
    process.exit(1);
  }
  throw e;
}

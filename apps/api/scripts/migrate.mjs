// Applies pending SQL migrations (prisma/migrations/*.sql) to DATABASE_URL.
// Works for a local SQLite file and for Turso (libsql://…, with DATABASE_AUTH_TOKEN).
// New migration: npm run db:diff -w @onet/api is the full schema; for changes use
//   npx prisma migrate diff --from-url <current db> --to-schema-datamodel prisma/schema.prisma --script
import { createClient } from "@libsql/client";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, "..", "prisma", "migrations");
const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });

await client.execute(`CREATE TABLE IF NOT EXISTS "_migrations" ("name" TEXT PRIMARY KEY, "appliedAt" TEXT NOT NULL)`);
const applied = new Set((await client.execute(`SELECT name FROM "_migrations"`)).rows.map((r) => r.name));
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
let count = 0;
for (const f of files) {
  if (applied.has(f)) continue;
  const sql = readFileSync(path.join(dir, f), "utf8");
  // Applying the migration and recording it is atomic (local file and Turso alike): a failure
  // half-way leaves neither partial schema changes nor a missing _migrations row behind.
  // Migration files must therefore not contain their own BEGIN/COMMIT.
  const tx = await client.transaction("write");
  try {
    await tx.executeMultiple(sql);
    await tx.execute({ sql: `INSERT INTO "_migrations" (name, appliedAt) VALUES (?, ?)`, args: [f, new Date().toISOString()] });
    await tx.commit();
  } catch (e) {
    let outcome = "transaction already closed, no explicit rollback ran";
    if (!tx.closed) {
      try {
        await tx.rollback();
        outcome = "rolled back";
      } catch (rbErr) {
        outcome = "rollback FAILED";
        console.error(`✗ ${f}: rollback failed`, rbErr);
        console.error(`✗ ${f}: no _migrations row was recorded, so the schema may be partially migrated and this migration will be retried on the next run. Inspect the database before re-running.`);
      }
    }
    console.error(`✗ ${f} failed (${outcome})`);
    client.close();
    throw e;
  } finally {
    tx.close();
  }
  console.log(`✓ applied ${f}`);
  count++;
}
console.log(count ? `migrations: ${count} applied` : "migrations: up to date");
client.close();

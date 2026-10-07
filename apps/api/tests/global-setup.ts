import { execSync } from "child_process";
import { createRequire } from "module";
import { rmSync } from "fs";

// Integration tests run against an isolated, freshly migrated and seeded SQLite file.
export default function setup() {
  const env = { ...process.env, DATABASE_URL: "file:./prisma/test.db" };
  rmSync("prisma/test.db", { force: true });
  execSync("node scripts/migrate.mjs", { env, stdio: "ignore" });
  execSync(`"${process.execPath}" "${createRequire(import.meta.url).resolve("tsx/cli")}" prisma/seed.ts`, { env, stdio: "ignore" });
}

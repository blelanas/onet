import { execSync } from "child_process";
import { rmSync } from "fs";

// Integration tests run against an isolated, freshly migrated and seeded SQLite file.
export default function setup() {
  const env = { ...process.env, DATABASE_URL: "file:./prisma/test.db" };
  rmSync("prisma/test.db", { force: true });
  execSync("node scripts/migrate.mjs", { env, stdio: "ignore" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "ignore" });
}

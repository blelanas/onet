import { execSync } from "child_process";
import { rmSync } from "fs";

// Integration tests run against an isolated, freshly seeded SQLite database (prisma/test.db).
export default function setup() {
  const env = { ...process.env, DATABASE_URL: "file:./test.db" };
  rmSync("prisma/test.db", { force: true });
  execSync("npx prisma db push --skip-generate", { env, stdio: "ignore" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "ignore" });
}

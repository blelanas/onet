import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    // A non-Tunisian zone, so tests catch code that relies on the host time zone.
    env: { DATABASE_URL: "file:./prisma/test.db", NODE_ENV: "test", TZ: "America/Los_Angeles" },
    testTimeout: 20000,
    fileParallelism: false,
  },
  resolve: { alias: { "@api": path.resolve(__dirname, "src") } },
});

import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { env } from "@api/env";

// libSQL driver adapter: same client for a local SQLite file and for Turso in production.
function createClient() {
  const adapter = new PrismaLibSQL({ url: env.DATABASE_URL, authToken: env.DATABASE_AUTH_TOKEN });
  return new PrismaClient({ adapter, log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const db = globalForPrisma.prisma ?? createClient();
if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;

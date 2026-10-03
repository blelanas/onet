// Runtime configuration (validated once at startup).
function required(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 4000),
  /** "file:./dev.db" locally, "libsql://<db>.turso.io" in production. */
  DATABASE_URL: required("DATABASE_URL", "file:./prisma/dev.db"),
  DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN,
  /** Comma-separated list of allowed web origins (Firebase Hosting URLs, localhost). */
  CORS_ORIGINS: (process.env.CORS_ORIGINS ?? "http://localhost:5173").split(",").map((s) => s.trim()).filter(Boolean),
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER ?? "mock",
};
export const isProd = env.NODE_ENV === "production";

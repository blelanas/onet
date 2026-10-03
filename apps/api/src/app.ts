import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "@api/env";
import { als } from "@api/lib/context";
import { errorHandler, sendData } from "@api/lib/http";
import { authRouter } from "@api/modules/auth/routes";
import { filesRouter } from "@api/modules/files/routes";
import { registerModules } from "@api/modules";

/** Origin allow-list with `*` wildcards (Firebase preview channels get random suffixes). */
function originAllowed(origin: string) {
  return env.CORS_ORIGINS.some((pattern) => {
    if (pattern === origin) return true;
    if (!pattern.includes("*")) return false;
    const re = new RegExp(`^${pattern.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[a-z0-9-]*")}$`);
    return re.test(origin);
  });
}

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // Render / proxies set X-Forwarded-For
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } })); // files are embedded by the web app
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || originAllowed(origin)),
      allowedHeaders: ["Content-Type", "Authorization", "X-Locale"],
      exposedHeaders: ["Content-Disposition"],
      maxAge: 86400,
    }),
  );
  // Per-request context (current user cache, ip, locale).
  app.use((req, _res, next) => als.run({ req, memo: new Map() }, next));
  // JSON bodies for API calls (multipart is parsed by the upload/import routes themselves).
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => sendData(res, { ok: true }));
  const api = express.Router();
  api.use(authRouter);
  api.use(filesRouter);
  registerModules(api);
  api.use((_req, res) => sendData(res, { ok: false, error: "errors.notFound" }, 404));
  app.use("/api", api);
  app.use(errorHandler);
  return app;
}

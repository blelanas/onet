import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { db } from "@api/lib/db";
import { verifyPassword } from "@api/lib/auth/password";
import { createSession, destroySession, getCurrentUser } from "@api/lib/auth/session";
import { audit } from "@api/lib/audit";
import { mutation, query, sendData } from "@api/lib/http";
import { isLocale } from "@onet/shared";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("errors.email"),
  password: z.string().min(1, "errors.required"),
});

// Brute-force protection: per IP and per e-mail.
const perIp = rateLimit({ windowMs: 5 * 60_000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false, handler: (_req, res) => sendData(res, { ok: false, error: "errors.tooManyAttempts" }, 429) });
/**
 * Failed-login throttle keyed by e-mail + IP: an attacker elsewhere can't lock the owner out,
 * while repeated guesses from one client are slowed down. Expired entries are pruned and the
 * map is bounded so random e-mails can't grow it without limit.
 */
const failures = new Map<string, { n: number; until: number }>();
const MAX_TRACKED = 10_000;
function pruneFailures() {
  const now = Date.now();
  for (const [k, v] of failures) if (v.until <= now) failures.delete(k);
  while (failures.size > MAX_TRACKED) failures.delete(failures.keys().next().value!);
}

authRouter.post(
  "/auth/login",
  perIp,
  mutation(async (req) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (fieldErrors[String(i.path[0])] = i.message));
      return { ok: false, error: "errors.validation", fieldErrors };
    }
    const { email, password } = parsed.data;
    const key = `${email}|${req.ip}`;
    pruneFailures();
    const f = failures.get(key);
    if (f && f.n >= 5 && f.until > Date.now()) return { ok: false, error: "errors.tooManyAttempts" };

    const user = await db.user.findUnique({ where: { email } });
    const valid = user && user.isActive && (await verifyPassword(password, user.passwordHash));
    if (!user || !valid) {
      const cur = failures.get(key) ?? { n: 0, until: 0 };
      failures.set(key, { n: cur.n + 1, until: Date.now() + 5 * 60_000 });
      await audit(user?.id ?? null, "login_failed", "User", user?.id, { email });
      return { ok: false, error: "errors.invalidCredentials" };
    }
    failures.delete(key);
    const session = await createSession(user.id);
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await audit(user.id, "login", "User", user.id);
    return { ok: true, data: { token: session.token, expiresAt: session.expiresAt, locale: user.locale }, message: "toast.welcome" };
  }),
);

authRouter.post(
  "/auth/logout",
  mutation(async () => {
    const user = await getCurrentUser();
    if (user) await audit(user.id, "logout", "User", user.id);
    await destroySession();
    return { ok: true };
  }),
);

/** Current user for the web app shell (null when anonymous). */
authRouter.get(
  "/auth/me",
  query(async () => {
    const user = await getCurrentUser();
    if (!user) return null;
    const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      locale: user.locale,
      avatarUrl: user.avatarUrl,
      roles: user.roles,
      perms: [...user.permissions],
      memberId: user.memberId,
      memberType: user.memberType,
      points: user.points,
      unread,
    };
  }),
);

authRouter.post(
  "/auth/locale",
  mutation(async (req) => {
    const locale = req.body?.locale;
    if (!isLocale(locale)) return { ok: false, error: "errors.validation" };
    const user = await getCurrentUser();
    if (user) await db.user.update({ where: { id: user.id }, data: { locale } });
    return { ok: true };
  }),
);

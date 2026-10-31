import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { db } from "@api/lib/db";
import { verifyDummyPassword, verifyPassword } from "@api/lib/auth/password";
import { createSession, destroySession, getCurrentUser } from "@api/lib/auth/session";
import { googleClientId, verifyGoogleCredential } from "@api/lib/auth/google";
import { can } from "@api/lib/auth/guards";
import { audit } from "@api/lib/audit";
import { mutation, query, sendData } from "@api/lib/http";
import { isLocale, type ActionResult } from "@onet/shared";

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
    // Unknown/inactive accounts still pay for a bcrypt comparison so response time doesn't reveal them.
    const valid = user && user.isActive ? await verifyPassword(password, user.passwordHash) : await verifyDummyPassword(password);
    if (!user || !valid) {
      const cur = failures.get(key) ?? { n: 0, until: 0 };
      failures.set(key, { n: cur.n + 1, until: Date.now() + 5 * 60_000 });
      await audit(user?.id ?? null, "login_failed", "User", user?.id, { email });
      return { ok: false, error: "errors.invalidCredentials" };
    }
    failures.delete(key);
    return openSession(user, "password");
  }),
);

/**
 * Common end of every sign-in once the person has proven who they are (right password, or a valid
 * Google token for that e-mail): same status rules and same response whatever the method.
 * PENDING sign-ups get a session (the web app shows them the waiting screen); REJECTED ones don't.
 */
async function openSession(user: { id: string; status: string; locale: string }, method: "password" | "google"): Promise<ActionResult<{ token: string; expiresAt: Date; locale: string }>> {
  const details = method === "google" ? { method } : undefined;
  // A declined sign-up: the person proved they own the account, so saying why is not an account-enumeration leak.
  if (user.status === "REJECTED") {
    await audit(user.id, "login_rejected", "User", user.id, details);
    return { ok: false, error: "errors.accountRejected" };
  }
  const session = await createSession(user.id);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit(user.id, "login", "User", user.id, details);
  return { ok: true, data: { token: session.token, expiresAt: session.expiresAt, locale: user.locale }, message: "toast.welcome" };
}

const googleSchema = z.object({ credential: z.string().min(1, "errors.required").max(8192) });

/**
 * "Continue with Google": the web app sends the ID token from Google Identity Services. It only
 * signs in to an EXISTING account with that (verified) e-mail: accounts are never created from
 * Google. An unknown e-mail answers errors.googleNoAccount so the web app can open the sign-up form.
 */
authRouter.post(
  "/auth/google",
  perIp,
  mutation(async (req) => {
    const clientId = googleClientId();
    if (!clientId) return { ok: false, error: "errors.googleNotConfigured" };
    const parsed = googleSchema.safeParse(req.body);
    if (!parsed.success) return { ok: false, error: "errors.validation", fieldErrors: { credential: parsed.error.issues[0]!.message } };
    const key = `google|${req.ip}`;
    pruneFailures();
    const f = failures.get(key);
    if (f && f.n >= 5 && f.until > Date.now()) return { ok: false, error: "errors.tooManyAttempts" };
    // Every failure is audited; bad tokens are also throttled like wrong passwords.
    const fail = async (error: string, reason: string, opts: { userId?: string; email?: string; throttle?: boolean } = {}): Promise<ActionResult> => {
      if (opts.throttle) {
        const cur = failures.get(key) ?? { n: 0, until: 0 };
        failures.set(key, { n: cur.n + 1, until: Date.now() + 5 * 60_000 });
      }
      await audit(opts.userId ?? null, "login_failed", "User", opts.userId, { method: "google", reason, ...(opts.email ? { email: opts.email } : {}) });
      return { ok: false, error };
    };

    let identity;
    try {
      identity = await verifyGoogleCredential(parsed.data.credential, clientId);
    } catch {
      return fail("errors.googleInvalid", "invalid_token", { throttle: true });
    }
    const email = identity.email.trim().toLowerCase();
    if (!identity.emailVerified) return fail("errors.googleUnverified", "email_unverified", { email, throttle: true });
    failures.delete(key);

    const user = await db.user.findUnique({ where: { email } });
    // Google proved this person owns the e-mail, so these answers reveal nothing to a stranger.
    if (!user) return fail("errors.googleNoAccount", "no_account", { email });
    if (!user.isActive) return fail("errors.accountInactive", "inactive", { userId: user.id, email });
    return openSession(user, "google");
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
    const [unread, pendingApprovals, requested] = await Promise.all([
      db.notification.count({ where: { userId: user.id, readAt: null } }),
      can(user, "users.approve") ? db.user.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
      user.status === "PENDING" ? db.user.findUnique({ where: { id: user.id }, select: { requestedRole: true } }) : Promise.resolve(null),
    ]);
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
      /** ACTIVE, or PENDING while a sign-up awaits approval (the web app then shows a waiting screen). */
      status: user.status,
      requestedRole: requested?.requestedRole ?? null,
      /** Nav badge for approvers (0 for everybody else). */
      pendingApprovals,
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

"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions";
import { LOCALE_COOKIE } from "@/i18n/config";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("errors.email"),
  password: z.string().min(1, "errors.required"),
  next: z.string().optional(),
});

// Naive in-memory throttle (per email) — replace with Redis/rate-limiter in multi-instance deployments.
const attempts = new Map<string, { n: number; until: number }>();

export async function login(fd: FormData): Promise<ActionResult<{ next: string }>> {
  const parsed = loginSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => (fieldErrors[String(i.path[0])] = i.message));
    return { ok: false, error: "errors.validation", fieldErrors };
  }
  const { email, password, next } = parsed.data;
  const a = attempts.get(email);
  if (a && a.n >= 5 && a.until > Date.now()) return { ok: false, error: "errors.tooManyAttempts" };

  const user = await db.user.findUnique({ where: { email } });
  const valid = user && user.isActive && (await verifyPassword(password, user.passwordHash));
  if (!user || !valid) {
    const cur = attempts.get(email) ?? { n: 0, until: 0 };
    attempts.set(email, { n: cur.n + 1, until: Date.now() + 5 * 60_000 });
    await audit(user?.id ?? null, "login_failed", "User", user?.id, { email });
    return { ok: false, error: "errors.invalidCredentials" };
  }
  attempts.delete(email);
  await createSession(user.id);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  (await cookies()).set(LOCALE_COOKIE, user.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  await audit(user.id, "login", "User", user.id);
  const safeNext = next && next.startsWith("/dashboard") ? next : "/dashboard";
  return { ok: true, data: { next: safeNext }, message: "toast.welcome" };
}

export async function logout() {
  const user = await getCurrentUser();
  if (user) await audit(user.id, "logout", "User", user.id);
  await destroySession();
  redirect("/login");
}

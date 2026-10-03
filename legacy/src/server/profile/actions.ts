"use server";
import { createHash } from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError } from "@/lib/auth/guards";
import { getCurrentUser, SESSION_COOKIE } from "@/lib/auth/session";
import { hashPassword, isStrongPassword, verifyPassword } from "@/lib/auth/password";
import { ActionError, formToObject, runAction, zs } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { LOCALE_COOKIE, LOCALES } from "@/i18n/config";

async function me() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  return user;
}

const profileSchema = z.object({
  name: zs.reqStr(120),
  phone: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : typeof v === "string" ? v.trim() : v), z.string().max(30).regex(/^[+\d\s().-]{6,30}$/, "errors.validation").optional()),
  // Only our own uploads/demo media (served from /public) — never arbitrary external URLs.
  avatarUrl: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().max(300).regex(/^\/(uploads|demo)\/[\w./-]+$/, "errors.validation").optional()),
  locale: z.enum(LOCALES),
});

/** Any signed-in user edits their own name, phone, avatar and preferred language. */
export async function updateProfile(fd: FormData) {
  return runAction(profileSchema, formToObject(fd), async (d) => {
    const user = await me();
    await db.user.update({ where: { id: user.id }, data: { name: d.name, phone: d.phone ?? null, avatarUrl: d.avatarUrl ?? null, locale: d.locale } });
    // Keep the linked membership record in sync (photo + phone shown across the app).
    if (user.memberId) await db.member.update({ where: { id: user.memberId }, data: { photoUrl: d.avatarUrl ?? null, ...(d.phone ? { phone: d.phone } : {}) } });
    const jar = await cookies();
    jar.set(LOCALE_COOKIE, d.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    await audit(user.id, "update_profile", "User", user.id, { locale: d.locale, avatar: !!d.avatarUrl });
    revalidatePath("/dashboard", "layout");
  });
}

const passwordSchema = z.object({ current: z.string().min(1, "errors.required"), password: z.string().min(1, "errors.required"), confirm: z.string().min(1, "errors.required") });

/** Change own password: verify current, enforce policy, re-hash, sign out every other session. */
export async function changePassword(fd: FormData) {
  return runAction(passwordSchema, formToObject(fd), async (d) => {
    const user = await me();
    if (d.password !== d.confirm) throw new ActionError("errors.passwordMismatch");
    if (!isStrongPassword(d.password)) throw new ActionError("errors.weakPassword");
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
    if (!(await verifyPassword(d.current, row.passwordHash))) {
      await audit(user.id, "password_change_failed", "User", user.id);
      throw new ActionError("errors.wrongPassword");
    }
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(d.password) } });
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    const currentHash = token ? createHash("sha256").update(token).digest("hex") : "";
    const { count } = await db.session.deleteMany({ where: { userId: user.id, tokenHash: { not: currentHash } } });
    await audit(user.id, "password_change", "User", user.id, { otherSessionsRevoked: count });
    revalidatePath("/dashboard/profile");
  });
}

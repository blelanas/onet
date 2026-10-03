import { revalidatePath } from "@api/lib/cache";
import { z } from "zod";
import { db } from "@api/lib/db";
import { AuthError } from "@api/lib/auth/guards";
import { currentTokenHash, getCurrentUser } from "@api/lib/auth/session";
import { hashPassword, isStrongPassword, verifyPassword } from "@api/lib/auth/password";
import { ActionError, formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { LOCALES } from "@onet/shared";

async function me() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  return user;
}

const profileSchema = z.object({
  name: zs.reqStr(120),
  phone: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : typeof v === "string" ? v.trim() : v), z.string().max(30).regex(/^[+\d\s().-]{6,30}$/, "errors.validation").optional()),
  // Only our own uploads (/api/files/<id>) or bundled demo media — never arbitrary external URLs.
  avatarUrl: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().max(300).regex(/^\/(api\/files|demo)\/[\w./-]+$/, "errors.validation").optional()),
  locale: z.enum(LOCALES),
});

/** Any signed-in user edits their own name, phone, avatar and preferred language. */
export async function updateProfile(fd: FormData | Record<string, unknown>) {
  return runAction(profileSchema, formToObject(fd), async (d) => {
    const user = await me();
    await db.user.update({ where: { id: user.id }, data: { name: d.name, phone: d.phone ?? null, avatarUrl: d.avatarUrl ?? null, locale: d.locale } });
    // Keep the linked membership record in sync (photo + phone shown across the app).
    if (user.memberId) await db.member.update({ where: { id: user.memberId }, data: { photoUrl: d.avatarUrl ?? null, ...(d.phone ? { phone: d.phone } : {}) } });
    await audit(user.id, "update_profile", "User", user.id, { locale: d.locale, avatar: !!d.avatarUrl });
    revalidatePath("/dashboard", "layout");
  });
}

const passwordSchema = z.object({ current: z.string().min(1, "errors.required"), password: z.string().min(1, "errors.required"), confirm: z.string().min(1, "errors.required") });

/** Change own password: verify current, enforce policy, re-hash, sign out every other session. */
export async function changePassword(fd: FormData | Record<string, unknown>) {
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
    // Sign out every OTHER session; the current bearer token stays valid.
    const tokenHash = currentTokenHash() ?? "";
    const { count } = await db.session.deleteMany({ where: { userId: user.id, NOT: { tokenHash } } });
    await audit(user.id, "password_change", "User", user.id, { otherSessionsRevoked: count });
    revalidatePath("/dashboard/profile");
  });
}

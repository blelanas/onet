"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import type { CurrentUser } from "@/lib/auth/session";
import { hashPassword, isStrongPassword } from "@/lib/auth/password";
import { ActionError, formToObject, runAction, zs } from "@/lib/actions";
import { audit } from "@/lib/audit";

/** Roles only holders of roles.manage may grant, revoke, or manage the users of. */
const PRIVILEGED = ["super_admin", "admin"];

const email = z.string().trim().toLowerCase().email("errors.email");
const roleKeys = z.array(z.string().min(1)).min(1, "errors.required");

function assertCanTouchPrivileged(actor: CurrentUser, keys: string[]) {
  if (keys.some((k) => PRIVILEGED.includes(k)) && !actor.permissions.has("roles.manage")) throw new ActionError("errors.forbidden");
}

async function targetRoleKeys(userId: string) {
  const u = await db.user.findUnique({ where: { id: userId }, select: { id: true, roles: { select: { role: { select: { key: true } } } } } });
  if (!u) throw new ActionError("errors.notFound");
  return u.roles.map((r) => r.role.key);
}

async function assertAnotherSuperAdmin(excludingUserId: string) {
  const others = await db.user.count({ where: { id: { not: excludingUserId }, isActive: true, roles: { some: { role: { key: "super_admin" } } } } });
  if (!others) throw new ActionError("errors.forbidden");
}

const createSchema = z.object({ name: zs.reqStr(120), email, phone: zs.optStr, password: z.string().min(1, "errors.required"), roles: roleKeys });

export async function createUser(fd: FormData) {
  return runAction(createSchema, formToObject(fd), async (d) => {
    const actor = await requirePermission("users.manage");
    if (!isStrongPassword(d.password)) throw new ActionError("errors.weakPassword");
    assertCanTouchPrivileged(actor, d.roles);
    if (await db.user.findUnique({ where: { email: d.email } })) throw new ActionError("errors.emailTaken");
    const roles = await db.role.findMany({ where: { key: { in: d.roles } }, select: { id: true, key: true } });
    if (roles.length !== new Set(d.roles).size) throw new ActionError("errors.validation");
    const u = await db.user.create({
      data: { name: d.name, email: d.email, phone: d.phone ?? null, passwordHash: await hashPassword(d.password), roles: { create: roles.map((r) => ({ roleId: r.id })) } },
    });
    await audit(actor.id, "create", "User", u.id, { email: u.email, roles: d.roles });
    revalidatePath("/dashboard/settings/users");
    return { id: u.id };
  });
}

const rolesSchema = z.object({ userId: zs.id, roles: roleKeys });

export async function updateUserRoles(fd: FormData) {
  return runAction(rolesSchema, formToObject(fd), async (d) => {
    const actor = await requirePermission("users.manage");
    const current = await targetRoleKeys(d.userId);
    const next = [...new Set(d.roles)];
    const added = next.filter((k) => !current.includes(k));
    const removed = current.filter((k) => !next.includes(k));
    // Managing an admin account, or granting/revoking an admin role, requires roles.manage.
    assertCanTouchPrivileged(actor, [...current, ...added, ...removed]);
    if (removed.includes("super_admin")) {
      if (d.userId === actor.id) throw new ActionError("errors.forbidden");
      await assertAnotherSuperAdmin(d.userId);
    }
    const roles = await db.role.findMany({ where: { key: { in: next } }, select: { id: true } });
    if (roles.length !== next.length) throw new ActionError("errors.validation");
    await db.$transaction([db.userRole.deleteMany({ where: { userId: d.userId } }), db.userRole.createMany({ data: roles.map((r) => ({ userId: d.userId, roleId: r.id })) })]);
    await audit(actor.id, "permission_change", "User", d.userId, { added, removed });
    revalidatePath("/dashboard/settings/users");
  });
}

export async function setUserActive(userId: string, active: boolean) {
  return runAction(z.object({ userId: zs.id, active: z.boolean() }), { userId, active }, async (d) => {
    const actor = await requirePermission("users.manage");
    if (d.userId === actor.id) throw new ActionError("errors.forbidden");
    const keys = await targetRoleKeys(d.userId);
    assertCanTouchPrivileged(actor, keys);
    if (!d.active && keys.includes("super_admin")) await assertAnotherSuperAdmin(d.userId);
    await db.user.update({ where: { id: d.userId }, data: { isActive: d.active } });
    if (!d.active) await db.session.deleteMany({ where: { userId: d.userId } });
    await audit(actor.id, d.active ? "activate" : "deactivate", "User", d.userId);
    revalidatePath("/dashboard/settings/users");
  });
}

const resetSchema = z.object({ userId: zs.id, password: z.string().min(1, "errors.required") });

export async function resetUserPassword(fd: FormData) {
  return runAction(resetSchema, formToObject(fd), async (d) => {
    const actor = await requirePermission("users.manage");
    if (!isStrongPassword(d.password)) throw new ActionError("errors.weakPassword");
    assertCanTouchPrivileged(actor, await targetRoleKeys(d.userId));
    await db.user.update({ where: { id: d.userId }, data: { passwordHash: await hashPassword(d.password) } });
    // Sign the user out everywhere (except the admin doing it on their own account).
    await db.session.deleteMany({ where: { userId: d.userId, ...(d.userId === actor.id ? { id: "__keep__" } : {}) } });
    await audit(actor.id, "reset_password", "User", d.userId);
    revalidatePath("/dashboard/settings/users");
  });
}

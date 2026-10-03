import { revalidatePath } from "@api/lib/cache";
import { z } from "zod";
import { db } from "@api/lib/db";
import { requirePermission } from "@api/lib/auth/guards";
import { ActionError, formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";

const toggleSchema = z.object({ roleId: zs.id, permission: z.string().min(1).max(80), granted: z.boolean() });

/** Grants or revokes one permission on a role. The super_admin role is locked (always everything). */
export async function setRolePermission(roleId: string, permission: string, granted: boolean) {
  return runAction(toggleSchema, { roleId, permission, granted }, async (d) => {
    const actor = await requirePermission("roles.manage");
    const [role, perm] = await Promise.all([db.role.findUnique({ where: { id: d.roleId } }), db.permission.findUnique({ where: { key: d.permission } })]);
    if (!role || !perm) throw new ActionError("errors.notFound");
    if (role.key === "super_admin") throw new ActionError("errors.forbidden");
    if (d.granted) {
      await db.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } }, create: { roleId: role.id, permissionId: perm.id }, update: {} });
    } else {
      await db.rolePermission.deleteMany({ where: { roleId: role.id, permissionId: perm.id } });
    }
    await audit(actor.id, "permission_change", "Role", role.id, { role: role.key, permission: perm.key, granted: d.granted });
    revalidatePath("/dashboard", "layout");
  });
}

const roleSchema = z.object({
  key: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "errors.required")
    .max(40)
    .regex(/^[a-z][a-z0-9_]*$/, "errors.validation"),
  name: zs.reqStr(80),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "errors.validation").default("#6366f1"),
  description: zs.optStr,
  copyFrom: zs.optId,
});

export async function createRole(fd: FormData | Record<string, unknown>) {
  return runAction(roleSchema, formToObject(fd), async (d) => {
    const actor = await requirePermission("roles.manage");
    if (await db.role.findUnique({ where: { key: d.key } })) throw new ActionError("errors.inUse");
    const base = d.copyFrom ? await db.role.findUnique({ where: { id: d.copyFrom }, select: { key: true, permissions: { select: { permissionId: true } } } }) : null;
    // Never clone the all-powerful role into a custom one.
    const perms = base && base.key !== "super_admin" ? base.permissions : [];
    const role = await db.role.create({
      data: { key: d.key, name: d.name, color: d.color, description: d.description ?? null, isSystem: false, permissions: { create: perms.map((p) => ({ permissionId: p.permissionId })) } },
    });
    await audit(actor.id, "permission_change", "Role", role.id, { created: role.key, copyFrom: base?.key ?? null });
    revalidatePath("/dashboard/settings/roles");
    return { id: role.id };
  });
}

export async function deleteRole(id: string) {
  return runAction(zs.id, id, async (roleId) => {
    const actor = await requirePermission("roles.manage");
    const role = await db.role.findUnique({ where: { id: roleId }, include: { _count: { select: { users: true } } } });
    if (!role) throw new ActionError("errors.notFound");
    if (role.isSystem || role._count.users > 0) throw new ActionError("errors.inUse");
    await db.role.delete({ where: { id: roleId } });
    await audit(actor.id, "permission_change", "Role", roleId, { deleted: role.key });
    revalidatePath("/dashboard/settings/roles");
  });
}

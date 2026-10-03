/**
 * Production bootstrap (idempotent, never deletes data):
 *  - creates missing permissions and system roles (with their default grants),
 *  - grants new default permissions to existing system roles,
 *  - creates the first super administrator from ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME.
 * Usage: DATABASE_URL=… DATABASE_AUTH_TOKEN=… ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run db:bootstrap -w @onet/api
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, ROLE_COLORS, ROLE_KEYS } from "@onet/shared";

const ROLE_NAMES: Record<string, string> = {
  super_admin: "Super administrateur", admin: "Administrateur", accountant: "Comptable", monitor: "Moniteur", parent: "Parent", member: "Membre", kid: "Enfant",
};

const db = new PrismaClient({ adapter: new PrismaLibSQL({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db", authToken: process.env.DATABASE_AUTH_TOKEN }) });

async function main() {
  for (const key of ALL_PERMISSIONS) await db.permission.upsert({ where: { key }, create: { key, module: PERMISSIONS[key] }, update: {} });
  const perms = Object.fromEntries((await db.permission.findMany()).map((p) => [p.key, p.id]));

  for (const key of ROLE_KEYS) {
    const role = await db.role.upsert({ where: { key }, create: { key, name: ROLE_NAMES[key], color: ROLE_COLORS[key], isSystem: true }, update: {} });
    for (const p of DEFAULT_ROLE_PERMISSIONS[key])
      await db.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: perms[p] } }, create: { roleId: role.id, permissionId: perms[p] }, update: {} });
  }
  console.log(`✓ ${ALL_PERMISSIONS.length} permissions, ${ROLE_KEYS.length} roles`);

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 10) throw new Error("ADMIN_PASSWORD must be at least 10 characters");
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) console.log(`• admin ${email} already exists — unchanged`);
    else {
      const superAdmin = await db.role.findUniqueOrThrow({ where: { key: "super_admin" } });
      await db.user.create({
        data: { email, name: process.env.ADMIN_NAME ?? "Administrateur ONET", passwordHash: await bcrypt.hash(password, 12), roles: { create: [{ roleId: superAdmin.id }] } },
      });
      console.log(`✓ super administrator ${email} created`);
    }
  }
  if (!(await db.setting.findUnique({ where: { key: "organization.profile" } }))) {
    await db.setting.create({
      data: { key: "organization.profile", value: JSON.stringify({ name: "ONET Teboulba", fullName: "Organisation Nationale de l'Enfance Tunisienne — Comité local de Teboulba", fullNameAr: "المنظمة التونسية للطفولة — الهيئة المحلية بطبلبة" }) },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

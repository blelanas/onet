import { db } from "@api/lib/db";
import { hashPassword } from "@api/lib/auth/password";

/**
 * Parents no longer get accounts (they are contacts on the kid cards), so the demo data has none.
 * Some tests still need someone signed in from outside the team, as an old parent account would be:
 * this creates (once) a parent-role account with the demo password, linked to no member record.
 */
export async function ensureLegacyParent() {
  const email = "legacy-parent@onet-teboulba.tn";
  const role = await db.role.findUniqueOrThrow({ where: { key: "parent" } });
  const passwordHash = await hashPassword("Onet2026!");
  await db.user.upsert({
    where: { email },
    create: { email, name: "Ancien compte parent", passwordHash, roles: { create: [{ roleId: role.id }] } },
    update: {},
  });
  return email;
}

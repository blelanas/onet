import { afterAll, describe, expect, it } from "vitest";
import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import type { Permission, RoleKey } from "@onet/shared";
import { visibleMemberIds, registrableMemberIds } from "@api/lib/auth/scope";
import { refreshInvoiceStatus } from "@api/lib/services/invoices";

async function loadUser(email: string): Promise<CurrentUser> {
  const u = await db.user.findUniqueOrThrow({
    where: { email },
    include: { member: true, roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  });
  return {
    id: u.id, name: u.name, email: u.email, locale: u.locale, avatarUrl: null, points: 0,
    roles: u.roles.map((r) => r.role.key as RoleKey),
    permissions: new Set(u.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.key as Permission))),
    memberId: u.member?.id ?? null, memberType: u.member?.type ?? null, status: u.status,
  };
}

/**
 * Parents and kids no longer get accounts, but the scoping code still guards old accounts (deactivated
 * by migration 0005): give the demo family a temporary login to keep testing it.
 */
const temporary: string[] = [];
async function legacyAccount(memberId: string, role: "parent" | "kid") {
  const roleRow = await db.role.findUniqueOrThrow({ where: { key: role } });
  const u = await db.user.create({ data: { email: `legacy-${role}-${memberId}@x.tn`, name: role, passwordHash: "x", roles: { create: [{ roleId: roleRow.id }] }, member: { connect: { id: memberId } } } });
  temporary.push(u.id);
  return loadUser(u.email);
}
const demoFather = () => db.member.findFirstOrThrow({ where: { type: "PARENT", email: "mohamed.gharbi0@example.tn" }, include: { childrenLinks: { orderBy: { child: { membershipNumber: "asc" } } } } });

afterAll(async () => {
  await db.member.updateMany({ where: { userId: { in: temporary } }, data: { userId: null } });
  await db.user.deleteMany({ where: { id: { in: temporary } } });
  await db.$disconnect();
});

describe("data isolation", () => {
  it("a parent sees only themself and their own children", async () => {
    const parent = await legacyAccount((await demoFather()).id, "parent");
    const ids = await visibleMemberIds(parent);
    expect(ids).not.toBe("all");
    const kids = await db.guardianship.findMany({ where: { parentId: parent.memberId! } });
    expect(new Set(ids)).toEqual(new Set([parent.memberId!, ...kids.map((k) => k.childId)]));
    expect(kids).toHaveLength(3);
  });

  it("a kid sees only themself and cannot register anyone", async () => {
    const kid = await legacyAccount((await demoFather()).childrenLinks[0].childId, "kid");
    expect(await visibleMemberIds(kid)).toEqual([kid.memberId]);
    expect(await registrableMemberIds(kid)).toEqual([]);
  });

  it("a monitor sees the children of the groups they supervise", async () => {
    const mon = await loadUser("moniteur@onet-teboulba.tn");
    const ids = (await visibleMemberIds(mon)) as string[];
    const groups = await db.groupMonitor.findMany({ where: { memberId: mon.memberId! }, include: { group: { include: { children: true } } } });
    for (const g of groups) for (const c of g.group.children) expect(ids).toContain(c.id);
    const outsider = await db.member.findFirst({ where: { type: "CHILD", groupId: { notIn: groups.map((g) => g.groupId) }, tripRegistrations: { none: {} } } });
    if (outsider) expect(ids).not.toContain(outsider.id);
  });

  it("staff with members.read_all see everything", async () => {
    expect(await visibleMemberIds(await loadUser("comptable@onet-teboulba.tn"))).toBe("all");
  });
});

describe("invoice status", () => {
  it("moves PENDING → PARTIALLY_PAID → PAID with payments, and OVERDUE when past due", async () => {
    const payer = await db.member.findFirstOrThrow({ where: { type: "PARENT" } });
    const inv = await db.invoice.create({ data: { number: `TEST-${Date.now()}`, description: "test", amount: 30000, payerId: payer.id, dueDate: new Date(Date.now() + 86400000) } });
    await db.payment.create({ data: { invoiceId: inv.id, amount: 10000, method: "CASH" } });
    expect((await refreshInvoiceStatus(inv.id))?.status).toBe("PARTIALLY_PAID");
    await db.payment.create({ data: { invoiceId: inv.id, amount: 20000, method: "ONLINE" } });
    const paid = await refreshInvoiceStatus(inv.id);
    expect(paid?.status).toBe("PAID");
    expect(paid?.paidAt).toBeInstanceOf(Date);

    const late = await db.invoice.create({ data: { number: `TEST-L-${Date.now()}`, description: "late", amount: 5000, payerId: payer.id, dueDate: new Date(Date.now() - 86400000) } });
    expect((await refreshInvoiceStatus(late.id))?.status).toBe("OVERDUE");
  });
});

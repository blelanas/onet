import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import { assertCanSeeMember, memberScopeWhere } from "@/lib/auth/scope";
import { AuthError } from "@/lib/auth/guards";

export type MemberFilters = { q?: string; type?: string; status?: string; groupId?: string; sort?: string; skip?: number; take?: number };

export function memberSearchWhere(q?: string): Prisma.MemberWhereInput {
  if (!q) return {};
  const terms = q.trim().split(/\s+/).slice(0, 4);
  return {
    AND: terms.map((t) => ({
      OR: [
        { firstName: { contains: t } },
        { lastName: { contains: t } },
        { firstNameAr: { contains: t } },
        { lastNameAr: { contains: t } },
        { membershipNumber: { contains: t } },
        { email: { contains: t } },
        { phone: { contains: t } },
      ],
    })),
  };
}

const SORTS: Record<string, Prisma.MemberOrderByWithRelationInput[]> = {
  name: [{ lastName: "asc" }, { firstName: "asc" }],
  recent: [{ membershipDate: "desc" }],
  age: [{ dateOfBirth: "desc" }],
  number: [{ membershipNumber: "asc" }],
};

export async function listMembers(user: CurrentUser, f: MemberFilters) {
  const where: Prisma.MemberWhereInput = {
    AND: [
      await memberScopeWhere(user),
      memberSearchWhere(f.q),
      f.type ? { type: f.type } : {},
      f.status ? { membershipStatus: f.status } : {},
      f.groupId ? { OR: [{ groupId: f.groupId }, { monitoredGroups: { some: { groupId: f.groupId } } }] } : {},
    ],
  };
  const [rows, total] = await Promise.all([
    db.member.findMany({
      where,
      orderBy: SORTS[f.sort ?? "name"] ?? SORTS.name,
      skip: f.skip,
      take: f.take,
      include: {
        group: { select: { id: true, name: true, color: true } },
        parentLinks: { include: { parent: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
        childrenLinks: { include: { child: { select: { id: true, firstName: true, lastName: true, photoUrl: true } } } },
        monitoredGroups: { include: { group: { select: { id: true, name: true, color: true } } } },
        user: { select: { id: true } },
      },
    }),
    db.member.count({ where }),
  ]);
  return { rows, total };
}

export async function getMemberProfile(user: CurrentUser, id: string) {
  await assertCanSeeMember(user, id);
  const member = await db.member.findUnique({
    where: { id },
    include: {
      group: { include: { monitors: { include: { member: true } } } },
      user: { select: { id: true, email: true, lastLoginAt: true, roles: { include: { role: true } } } },
      parentLinks: { include: { parent: true } },
      childrenLinks: { include: { child: { include: { group: true } } } },
      monitoredGroups: { include: { group: { include: { _count: { select: { children: true } } } } } },
      activityEnrollments: { include: { activity: true } },
      eventRegistrations: { include: { event: true }, orderBy: { createdAt: "desc" } },
      tripRegistrations: { include: { trip: true }, orderBy: { createdAt: "desc" } },
      badges: { include: { badge: true }, orderBy: { awardedAt: "desc" } },
    },
  });
  if (!member) throw new AuthError("NOT_FOUND");
  return member;
}

export async function memberAttendance(memberId: string, take = 40) {
  return db.attendance.findMany({
    where: { memberId },
    orderBy: { date: "desc" },
    take,
    include: { group: { select: { name: true, color: true } }, activity: { select: { title: true } }, event: { select: { title: true } }, trip: { select: { title: true } } },
  });
}

/** Invoices concerning a member — as payer or as the child concerned. Financial data is
 *  only returned to finance staff or to the payer/guardians (never to kids). */
export async function memberInvoices(user: CurrentUser, memberId: string) {
  const isFinance = user.permissions.has("finance.read");
  const isGuardianOrSelf = user.memberId === memberId || (user.memberId && (await db.guardianship.count({ where: { parentId: user.memberId, childId: memberId } })) > 0);
  if (!isFinance && !(isGuardianOrSelf && user.permissions.has("invoices.pay"))) return null;
  return db.invoice.findMany({
    where: { OR: [{ payerId: memberId }, { childId: memberId }] },
    orderBy: { issuedAt: "desc" },
    include: { payments: true, child: { select: { firstName: true, lastName: true } } },
  });
}

export async function memberOptions(type?: string | string[]) {
  return db.member.findMany({
    where: type ? { type: Array.isArray(type) ? { in: type } : type } : {},
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, type: true, membershipNumber: true },
  });
}

export async function groupOptions() {
  return db.group.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, color: true } });
}

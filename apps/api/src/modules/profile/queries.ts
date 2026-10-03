import { db } from "@api/lib/db";

export async function myProfile(userId: string) {
  const [user, sessions] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        locale: true,
        lastLoginAt: true,
        createdAt: true,
        roles: { select: { role: { select: { key: true, color: true } } } },
        member: { select: { id: true, type: true, phone: true, membershipNumber: true, membershipDate: true, membershipStatus: true, group: { select: { name: true, color: true } } } },
      },
    }),
    db.session.count({ where: { userId, expiresAt: { gt: new Date() } } }),
  ]);
  return { user, sessions };
}

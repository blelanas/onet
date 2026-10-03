import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { AuthError } from "@api/lib/auth/guards";
import { announcementWhere } from "./audience";

export type AnnouncementFilters = { q?: string; priority?: string; audience?: string; expired?: boolean; skip?: number; take?: number };

export async function listAnnouncements(user: CurrentUser, f: AnnouncementFilters) {
  const scope = await announcementWhere(user, { includeExpired: f.expired });
  const now = new Date();
  const where: Prisma.AnnouncementWhereInput = {
    AND: [
      scope,
      f.q ? { OR: [{ title: { contains: f.q } }, { body: { contains: f.q } }] } : {},
      f.priority ? { priority: f.priority } : {},
      f.audience ? { audience: f.audience } : {},
      f.expired ? { expiresAt: { lte: now } } : {},
    ],
  };
  const [rows, total] = await Promise.all([
    db.announcement.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      skip: f.skip,
      take: f.take,
      include: { group: { select: { id: true, name: true, color: true } }, author: { select: { name: true, avatarUrl: true } } },
    }),
    db.announcement.count({ where }),
  ]);
  return { rows, total };
}

export async function getAnnouncementForEdit(user: CurrentUser, id: string) {
  if (!user.permissions.has("announcements.manage")) throw new AuthError("FORBIDDEN");
  const a = await db.announcement.findUnique({ where: { id } });
  if (!a) throw new AuthError("NOT_FOUND");
  return a;
}

export async function announcementGroupOptions() {
  return db.group.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, color: true } });
}

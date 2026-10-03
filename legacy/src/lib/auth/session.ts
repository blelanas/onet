import "server-only";
import { createHash, randomBytes } from "crypto";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Permission, RoleKey } from "@/lib/permissions";

export const SESSION_COOKIE = "onet_session";
const SESSION_TTL_DAYS = 14;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86400_000);
  const h = await headers();
  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent")?.slice(0, 250) ?? null,
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  locale: string;
  avatarUrl: string | null;
  roles: RoleKey[];
  permissions: Set<Permission>;
  memberId: string | null;
  memberType: string | null;
  points: number;
};

/** Resolves the logged-in user once per request. Returns null when anonymous/expired. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          member: { select: { id: true, type: true, points: true } },
          roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  const u = session.user;
  const permissions = new Set<Permission>();
  for (const ur of u.roles) for (const rp of ur.role.permissions) permissions.add(rp.permission.key as Permission);
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    locale: u.locale,
    avatarUrl: u.avatarUrl,
    roles: u.roles.map((r) => r.role.key as RoleKey),
    permissions,
    memberId: u.member?.id ?? null,
    memberType: u.member?.type ?? null,
    points: u.member?.points ?? 0,
  };
});

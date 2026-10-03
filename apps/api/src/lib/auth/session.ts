import { createHash, randomBytes } from "crypto";
import { db } from "@api/lib/db";
import { clientIp, ctx, requestCache } from "@api/lib/context";
import type { Permission, RoleKey } from "@onet/shared";

const SESSION_TTL_DAYS = 14;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Opaque bearer tokens: a random 256-bit token is returned once to the client
 * (Authorization: Bearer …); only its SHA-256 is stored, so a DB leak can't be replayed.
 * Cookies aren't used because the web app (Firebase Hosting) and the API (Render) live on
 * different sites, where third-party cookies are blocked by browsers.
 */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86400_000);
  await db.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt, ip: clientIp(), userAgent: ctx().req.headers["user-agent"]?.slice(0, 250) ?? null },
  });
  return { token, expiresAt };
}

function bearer(): string | null {
  const h = ctx().req.headers.authorization;
  return h?.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

export async function destroySession() {
  const token = bearer();
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export function currentTokenHash() {
  const t = bearer();
  return t ? hashToken(t) : null;
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

/** Resolves the authenticated user once per request. Returns null when anonymous/expired. */
export const getCurrentUser = requestCache("currentUser", async (): Promise<CurrentUser | null> => {
  const token = bearer();
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

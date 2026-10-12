import { z } from "zod";
import { db } from "@api/lib/db";
import { AuthError, requirePermission } from "@api/lib/auth/guards";
import { formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { zLocalFile } from "@api/modules/content/shared";

/**
 * Local bureau (أعضاء المكتب المحلي): the people presented on the public landing page, managed by
 * admins (content.manage). French (or Latin) and Arabic name / position, a photo and an order.
 */
const ORDER = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];

/** Active members, in order (public landing page). Only what the page shows. */
export function listPublicBureau() {
  return db.bureauMember.findMany({
    where: { isActive: true },
    orderBy: ORDER,
    select: { id: true, name: true, nameAr: true, position: true, positionAr: true, photoUrl: true },
  });
}

export async function listBureau() {
  await requirePermission("content.manage");
  return db.bureauMember.findMany({ orderBy: ORDER });
}

const optText = (max: number) => z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : typeof v === "string" ? v.trim() : v), z.string().max(max).optional());

const bureauSchema = z.object({
  id: zs.optId,
  name: zs.reqStr(80),
  nameAr: optText(80),
  position: zs.reqStr(80),
  positionAr: optText(80),
  photoUrl: zLocalFile,
  isActive: zs.bool,
});

/** Creates (appended at the end) or updates a bureau member. */
export async function saveBureauMember(fd: FormData | Record<string, unknown>) {
  return runAction(bureauSchema, { isActive: false, ...formToObject(fd) }, async ({ id, ...f }) => {
    const user = await requirePermission("content.manage");
    const data = { ...f, nameAr: f.nameAr ?? null, positionAr: f.positionAr ?? null, photoUrl: f.photoUrl ?? null };
    let row;
    if (id) {
      if (!(await db.bureauMember.findUnique({ where: { id }, select: { id: true } }))) throw new AuthError("NOT_FOUND");
      row = await db.bureauMember.update({ where: { id }, data });
    } else {
      const last = await db.bureauMember.aggregate({ _max: { sortOrder: true } });
      row = await db.bureauMember.create({ data: { ...data, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
    }
    await audit(user.id, id ? "update" : "create", "BureauMember", row.id, { name: row.name, isActive: row.isActive });
    return { id: row.id };
  });
}

export async function deleteBureauMember(id: string) {
  return runAction(zs.id, id, async (memberId) => {
    const user = await requirePermission("content.manage");
    const row = await db.bureauMember.findUnique({ where: { id: memberId }, select: { name: true } });
    if (!row) throw new AuthError("NOT_FOUND");
    await db.bureauMember.delete({ where: { id: memberId } });
    await audit(user.id, "delete", "BureauMember", memberId, { name: row.name });
  });
}

const moveSchema = z.object({ id: zs.id, direction: z.enum(["up", "down"]) });

/** Swaps a member with its neighbour; the whole list is renumbered 0…n-1 so ties can't stick. */
export async function moveBureauMember(input: unknown) {
  return runAction(moveSchema, input, async ({ id, direction }) => {
    const user = await requirePermission("content.manage");
    await db.$transaction(async (tx) => {
      const rows = await tx.bureauMember.findMany({ orderBy: ORDER, select: { id: true, sortOrder: true } });
      const i = rows.findIndex((r) => r.id === id);
      if (i < 0) throw new AuthError("NOT_FOUND");
      const j = direction === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= rows.length) return;
      [rows[i], rows[j]] = [rows[j], rows[i]];
      for (const [n, r] of rows.entries()) if (r.sortOrder !== n) await tx.bureauMember.update({ where: { id: r.id }, data: { sortOrder: n } });
    });
    await audit(user.id, "move", "BureauMember", id, { direction });
  });
}

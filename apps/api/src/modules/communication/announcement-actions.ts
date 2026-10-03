import { revalidatePath } from "@api/lib/cache";
import { z } from "zod";
import { db } from "@api/lib/db";
import { requirePermission } from "@api/lib/auth/guards";
import { ActionError, formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { ANNOUNCEMENT_PRIORITIES, AUDIENCES } from "@api/lib/constants";
import { notifyUsers } from "@api/lib/services/notifications";
import { audienceUserIds } from "./audience";
import { zonedTimeToDate } from "@onet/shared";

/** A date-only expiry ("YYYY-MM-DD") means "until the end of that day" in Tunisian time. */
const expiresAt = z.preprocess((v) => {
  const m = typeof v === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim()) : null;
  return m && Number(m[2]) >= 1 && Number(m[2]) <= 12 && Number(m[3]) >= 1 && Number(m[3]) <= 31 ? zonedTimeToDate(Number(m[1]), Number(m[2]), Number(m[3]), 23, 59, 59, 999) : v;
}, zs.optDate);

const schema = z.object({
  id: zs.optId,
  title: zs.reqStr(160),
  body: zs.reqStr(5000),
  audience: z.enum(AUDIENCES).default("ALL"),
  groupId: zs.optId,
  priority: z.enum(ANNOUNCEMENT_PRIORITIES).default("NORMAL"),
  isPinned: zs.bool.default(false),
  expiresAt,
  notify: zs.bool.default(false),
});

export async function saveAnnouncement(fd: FormData | Record<string, unknown>) {
  return runAction(schema, formToObject(fd), async (d) => {
    const user = await requirePermission("announcements.manage");
    if (d.audience === "GROUP") {
      if (!d.groupId) throw new ActionError("errors.validation");
      if (!(await db.group.findUnique({ where: { id: d.groupId }, select: { id: true } }))) throw new ActionError("errors.notFound");
    }
    const data = {
      title: d.title,
      body: d.body,
      audience: d.audience,
      groupId: d.audience === "GROUP" ? (d.groupId ?? null) : null,
      priority: d.priority,
      isPinned: d.isPinned,
      expiresAt: d.expiresAt ?? null,
    };
    const a = d.id
      ? await db.announcement.update({ where: { id: d.id }, data })
      : await db.announcement.create({ data: { ...data, authorId: user.id } });
    await audit(user.id, d.id ? "update" : "create", "Announcement", a.id, { title: a.title, audience: a.audience });
    if (d.notify) {
      const ids = (await audienceUserIds(a.audience, a.groupId)).filter((id) => id !== user.id);
      await notifyUsers(ids, { type: "ANNOUNCEMENT", title: a.title, body: a.body.slice(0, 160), link: `/dashboard/announcements#a-${a.id}` });
    }
    revalidatePath("/dashboard/announcements");
    return { id: a.id };
  });
}

export async function deleteAnnouncement(id: string) {
  return runAction(zs.id, id, async (aid) => {
    const user = await requirePermission("announcements.manage");
    const a = await db.announcement.delete({ where: { id: aid } }).catch(() => null);
    if (!a) throw new ActionError("errors.notFound");
    await audit(user.id, "delete", "Announcement", aid, { title: a.title });
    revalidatePath("/dashboard/announcements");
  });
}

export async function togglePin(id: string) {
  return runAction(zs.id, id, async (aid) => {
    const user = await requirePermission("announcements.manage");
    const a = await db.announcement.findUnique({ where: { id: aid } });
    if (!a) throw new ActionError("errors.notFound");
    await db.announcement.update({ where: { id: aid }, data: { isPinned: !a.isPinned } });
    await audit(user.id, "update", "Announcement", aid, { isPinned: !a.isPinned });
    revalidatePath("/dashboard/announcements");
  });
}

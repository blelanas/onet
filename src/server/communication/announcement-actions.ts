"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { ActionError, formToObject, runAction, zs } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { ANNOUNCEMENT_PRIORITIES, AUDIENCES } from "@/lib/constants";
import { notifyUsers } from "@/lib/services/notifications";
import { audienceUserIds } from "./audience";

const schema = z.object({
  id: zs.optId,
  title: zs.reqStr(160),
  body: zs.reqStr(5000),
  audience: z.enum(AUDIENCES).default("ALL"),
  groupId: zs.optId,
  priority: z.enum(ANNOUNCEMENT_PRIORITIES).default("NORMAL"),
  isPinned: zs.bool.default(false),
  expiresAt: zs.optDate,
  notify: zs.bool.default(false),
});

export async function saveAnnouncement(fd: FormData) {
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

import { z } from "zod";
import { db } from "@api/lib/db";
import { requirePermission } from "@api/lib/auth/guards";
import { formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { RESOURCE_TYPES } from "@api/lib/constants";
import { isHttpUrl, isLocalFile } from "./shared";

const RESOURCE_AUDIENCES = ["ALL", "PARENTS", "MONITORS", "KIDS"] as const;

const resourceSchema = z
  .object({
    id: zs.optId,
    title: zs.reqStr(200),
    description: zs.optStr,
    type: z.enum(RESOURCE_TYPES),
    category: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : typeof v === "string" ? v.trim() : v), z.string().max(80).optional()),
    audience: z.enum(RESOURCE_AUDIENCES),
    fileUrl: zs.optStr,
    linkUrl: zs.optStr,
    sizeBytes: zs.optInt,
  })
  .transform((d) => ({ ...d, url: d.type === "LINK" ? d.linkUrl : (d.fileUrl ?? d.linkUrl) }))
  .superRefine((d, ctx) => {
    const field = d.type === "LINK" || !d.fileUrl ? "linkUrl" : "fileUrl";
    if (!d.url) return ctx.addIssue({ code: "custom", path: [field], message: "content.resources.form.fileRequired" });
    // Links must be http(s) only (no javascript:, data:, file:…); files must be our own uploads.
    const ok = d.type === "LINK" ? isHttpUrl(d.url) : d.url === d.fileUrl ? isLocalFile(d.url) : isHttpUrl(d.url);
    if (!ok) ctx.addIssue({ code: "custom", path: [field], message: "content.common.invalidUrl" });
  });

export async function saveResource(fd: FormData | Record<string, unknown>) {
  return runAction(resourceSchema, formToObject(fd), async (data) => {
    const user = await requirePermission("content.manage");
    const payload = {
      title: data.title,
      description: data.description ?? null,
      type: data.type,
      category: data.category ?? null,
      audience: data.audience,
      url: data.url!,
      sizeBytes: data.url === data.fileUrl ? (data.sizeBytes ?? null) : null,
    };
    const r = data.id ? await db.resource.update({ where: { id: data.id }, data: payload }) : await db.resource.create({ data: payload });
    await audit(user.id, data.id ? "update" : "create", "Resource", r.id, { title: r.title, audience: r.audience });
    return { id: r.id };
  });
}

export async function deleteResource(id: string) {
  return runAction(zs.id, id, async (resId) => {
    const user = await requirePermission("content.manage");
    const r = await db.resource.delete({ where: { id: resId } });
    await audit(user.id, "delete", "Resource", resId, { title: r.title });
  });
}

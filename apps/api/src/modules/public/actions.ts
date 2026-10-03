import { revalidatePath } from "@api/lib/cache";
import { getTranslations } from "@api/lib/i18n";
import { z } from "zod";
import { db } from "@api/lib/db";
import { ActionError, formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { notifyRoles } from "@api/lib/services/notifications";
import { DEFAULT_LOCALE } from "@onet/shared";
import { hitRateLimit } from "./rate-limit";

// Anonymous public forms: zod validation + honeypot + per-IP rate limit. No auth required by design.

const email = z.string().trim().toLowerCase().max(160).email("errors.email");
const phone = z
  .string()
  .trim()
  .min(1, "errors.required")
  .max(30)
  .regex(/^\+?[0-9 ().-]{8,}$/, "errors.validation");
/** Honeypot: humans never see/fill it. */
const honeypot = z.preprocess((v) => (typeof v === "string" ? v : ""), z.string().max(500));

const joinSchema = z.object({
  parentName: zs.reqStr(120),
  email,
  phone,
  childName: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(120).optional()),
  childDob: zs.optDate.refine((d) => !d || (d < new Date() && d.getFullYear() > 1990), "errors.validation"),
  message: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(2000).optional()),
  consent: z.preprocess((v) => v === true || v === "on" || v === "true", z.literal(true, { error: "errors.required" })),
  website: honeypot,
});

export async function submitJoinRequest(fd: FormData | Record<string, unknown>) {
  return runAction(joinSchema, formToObject(fd), async (data) => {
    if (data.website) return { id: "ok" }; // bot: pretend success, store nothing
    if (!(await hitRateLimit("join"))) throw new ActionError("errors.tooManyAttempts");
    const req = await db.joinRequest.create({
      data: { parentName: data.parentName, email: data.email, phone: data.phone, childName: data.childName ?? null, childDob: data.childDob ?? null, message: data.message ?? null },
    });
    await audit(null, "create", "JoinRequest", req.id, { source: "public" });
    const t = await getTranslations({ locale: DEFAULT_LOCALE, namespace: "public.notify" });
    await notifyRoles(["super_admin", "admin"], {
      type: "SYSTEM",
      title: t("joinTitle", { name: data.parentName }),
      body: data.childName ? t("joinBodyChild", { child: data.childName }) : t("joinBody"),
      link: "/dashboard/join-requests",
    });
    revalidatePath("/dashboard/join-requests");
    return { id: req.id };
  });
}

const contactSchema = z.object({
  name: zs.reqStr(120),
  email,
  subject: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(160).optional()),
  body: z.string().trim().min(10, "errors.validation").max(4000),
  website: honeypot,
});

export async function submitContactMessage(fd: FormData | Record<string, unknown>) {
  return runAction(contactSchema, formToObject(fd), async (data) => {
    if (data.website) return { id: "ok" };
    if (!(await hitRateLimit("contact"))) throw new ActionError("errors.tooManyAttempts");
    const msg = await db.contactMessage.create({ data: { name: data.name, email: data.email, subject: data.subject ?? null, body: data.body } });
    await audit(null, "create", "ContactMessage", msg.id, { source: "public" });
    return { id: msg.id };
  });
}

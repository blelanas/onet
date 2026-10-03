"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { formToObject, runAction, zs } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { NOTIFICATION_CHANNELS, PAYMENT_METHODS } from "@/lib/constants";
import { setSetting } from "./store";

const optUrl = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().trim().url("errors.validation").max(300).optional());
const optEmail = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().trim().toLowerCase().email("errors.email").optional());

const orgSchema = z.object({
  name: zs.reqStr(120),
  fullName: zs.optStr,
  fullNameAr: zs.optStr,
  email: optEmail,
  phone: zs.optStr,
  address: zs.optStr,
  facebook: optUrl,
  instagram: optUrl,
  youtube: optUrl,
  website: optUrl,
  foundedYear: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(1900).max(2100).optional()),
  logoUrl: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().startsWith("/", "errors.validation").max(300).optional()),
});

export async function saveOrganization(fd: FormData) {
  return runAction(orgSchema, formToObject(fd), async ({ logoUrl, ...profile }) => {
    const user = await requirePermission("settings.manage");
    await setSetting("organization.profile", profile);
    if (logoUrl) await setSetting("organization.logoUrl", logoUrl);
    else await db.setting.deleteMany({ where: { key: "organization.logoUrl" } });
    await audit(user.id, "update", "Setting", "organization.profile", { name: profile.name });
    revalidatePath("/", "layout");
  });
}

const channelsSchema = z.object({ channels: z.array(z.enum(NOTIFICATION_CHANNELS)).optional() });

export async function saveNotificationChannels(fd: FormData) {
  return runAction(channelsSchema, formToObject(fd), async ({ channels }) => {
    const user = await requirePermission("settings.manage");
    const value = Array.from(new Set(["IN_APP", ...(channels ?? [])]));
    await setSetting("notifications.channels", value);
    await audit(user.id, "update", "Setting", "notifications.channels", { channels: value });
    revalidatePath("/dashboard/settings/notifications");
  });
}

const paymentsSchema = z.object({
  methods: z.array(z.enum(PAYMENT_METHODS)).optional(),
  bank: zs.optStr,
  holder: zs.optStr,
  rib: zs.optStr,
  iban: zs.optStr,
  membershipFee: zs.money,
});

export async function savePaymentSettings(fd: FormData) {
  return runAction(paymentsSchema, formToObject(fd), async (d) => {
    const user = await requirePermission("settings.manage");
    await setSetting("payments.methods", d.methods ?? []);
    await setSetting("payments.bank", { bank: d.bank, holder: d.holder, rib: d.rib, iban: d.iban });
    await setSetting("finance.membershipFee", d.membershipFee);
    await audit(user.id, "update", "Setting", "payments", { methods: d.methods ?? [], membershipFee: d.membershipFee });
    revalidatePath("/dashboard", "layout");
  });
}

export async function setContactMessageRead(id: string, isRead: boolean) {
  return runAction(z.object({ id: zs.id, isRead: z.boolean() }), { id, isRead }, async (d) => {
    await requirePermission("settings.manage");
    await db.contactMessage.updateMany({ where: { id: d.id }, data: { isRead: d.isRead } });
    revalidatePath("/dashboard/settings/contact");
  });
}

export async function deleteContactMessage(id: string) {
  return runAction(zs.id, id, async (mid) => {
    const user = await requirePermission("settings.manage");
    const m = await db.contactMessage.delete({ where: { id: mid } }).catch(() => null);
    if (m) await audit(user.id, "delete", "ContactMessage", mid, { email: m.email });
    revalidatePath("/dashboard/settings/contact");
  });
}

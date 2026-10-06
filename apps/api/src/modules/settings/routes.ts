import { Router, type Request } from "express";
import { db } from "@api/lib/db";
import { can, requirePermission, requireUser } from "@api/lib/auth/guards";
import { mutation, param, qs, query } from "@api/lib/http";
import { deleteContactMessage, saveNotificationChannels, saveOrganization, savePaymentSettings, setContactMessageRead } from "./actions";
import { listAuditLogs, listContactMessages, listPermissions, listRoles, listUsers } from "./queries";
import { createRole, deleteRole, setRolePermission } from "./role-actions";
import { getSetting, type BankDetails, type OrganizationProfile } from "./store";
import { createUser, resetUserPassword, setUserActive, updateUserRoles } from "./user-actions";

/** settings module routes (mounted under /api). */
export const router = Router();

function pageOf(req: Request, size: number) {
  const page = Math.max(1, Number(qs(req, "page")) || 1);
  return { page, pageSize: size, skip: (page - 1) * size, take: size };
}

/** Settings layout: badge counts for the sub-navigation (sections are filtered client-side from the user's permissions). */
export async function settingsNavPage() {
  const user = await requireUser();
  const unreadContact = can(user, "settings.manage") ? await db.contactMessage.count({ where: { isRead: false } }) : 0;
  return { badges: { contact: unreadContact } };
}
router.get("/settings/nav", query(settingsNavPage));

// ─── Organization / channels / payments ─────────────────────────────────────

export async function organizationSettingsPage() {
  await requirePermission("settings.manage");
  const [profile, logoUrl] = await Promise.all([getSetting<OrganizationProfile>("organization.profile", {}), getSetting<string | null>("organization.logoUrl", null)]);
  return { profile: profile ?? {}, logoUrl };
}
router.get("/settings/organization", query(organizationSettingsPage));
router.post("/settings/organization", mutation((req) => saveOrganization(req.body)));

export async function notificationSettingsPage() {
  await requirePermission("settings.manage");
  const channels = await getSetting<string[]>("notifications.channels", ["IN_APP"]);
  return { channels: Array.isArray(channels) ? channels : ["IN_APP"] };
}
router.get("/settings/notifications", query(notificationSettingsPage));
router.post("/settings/notifications", mutation((req) => saveNotificationChannels(req.body)));

export async function paymentSettingsPage() {
  await requirePermission("settings.manage");
  const [methods, bank, fee] = await Promise.all([
    getSetting<string[]>("payments.methods", ["CASH", "BANK_TRANSFER"]),
    getSetting<BankDetails>("payments.bank", {}),
    getSetting<number>("finance.membershipFee", 0),
  ]);
  return { methods: Array.isArray(methods) ? methods : [], bank: bank ?? {}, feeTnd: String((Number(fee) || 0) / 1000) };
}
router.get("/settings/payments", query(paymentSettingsPage));
router.post("/settings/payments", mutation((req) => savePaymentSettings(req.body)));

// ─── Users ──────────────────────────────────────────────────────────────────

export async function usersSettingsPage(req: Request) {
  const me = await requirePermission("users.manage");
  const { page, pageSize, skip, take } = pageOf(req, 15);
  const [{ rows, total }, roles] = await Promise.all([listUsers({ q: qs(req, "q"), role: qs(req, "role"), status: qs(req, "status"), skip, take }), listRoles()]);
  return {
    rows,
    total,
    page,
    pageSize,
    meId: me.id,
    canPrivileged: can(me, "roles.manage"),
    roles: roles.map((r) => ({ key: r.key, name: r.name, color: r.color })),
  };
}
router.get("/settings/users", query(usersSettingsPage));
router.post("/settings/users", mutation((req) => createUser(req.body)));
router.post("/settings/users/:id/roles", mutation((req) => updateUserRoles({ ...req.body, userId: param(req, "id") })));
router.post("/settings/users/:id/password", mutation((req) => resetUserPassword({ ...req.body, userId: param(req, "id") })));
router.post("/settings/users/:id/active", mutation((req) => setUserActive(param(req, "id"), req.body?.active === true)));

// ─── Roles & permissions ────────────────────────────────────────────────────

export async function rolesSettingsPage() {
  await requirePermission("roles.manage");
  const [roles, permissions] = await Promise.all([listRoles(), listPermissions()]);
  return { roles, permissions };
}
router.get("/settings/roles", query(rolesSettingsPage));
router.post("/settings/roles", mutation((req) => createRole(req.body)));
router.post("/settings/roles/:id/permissions", mutation((req) => setRolePermission(param(req, "id"), String(req.body?.permission ?? ""), req.body?.granted === true)));
router.delete("/settings/roles/:id", mutation((req) => deleteRole(param(req, "id"))));

// ─── Audit log ──────────────────────────────────────────────────────────────

export async function auditLogPage(req: Request) {
  await requirePermission("audit.read");
  const { page, pageSize, skip, take } = pageOf(req, 25);
  const data = await listAuditLogs({ userId: qs(req, "user"), action: qs(req, "action"), entity: qs(req, "entity"), q: qs(req, "q"), skip, take });
  return { ...data, page, pageSize };
}
router.get("/settings/audit", query(auditLogPage));

// ─── Contact messages (public site form) ────────────────────────────────────

export async function contactMessagesPage(req: Request) {
  await requirePermission("settings.manage");
  const { page, pageSize, skip, take } = pageOf(req, 10);
  const data = await listContactMessages({ status: qs(req, "status"), skip, take });
  return { ...data, page, pageSize };
}
router.get("/settings/contact", query(contactMessagesPage));
router.post("/settings/contact/:id/read", mutation((req) => setContactMessageRead(param(req, "id"), req.body?.isRead === true)));
router.delete("/settings/contact/:id", mutation((req) => deleteContactMessage(param(req, "id"))));

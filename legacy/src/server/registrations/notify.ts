import "server-only";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { notifyUsers } from "@/lib/services/notifications";
import { isLocale, DEFAULT_LOCALE } from "@/i18n/config";
import type { NotificationType } from "@/lib/constants";

type Translator = (key: string, values?: Record<string, string | number>) => string;
type Builder = (t: Translator) => { title: string; body?: string };

/** Sends one in-app notification per recipient, rendered in each recipient's own language. */
export async function notifyLocalized(userIds: string[], type: NotificationType, link: string, build: Builder) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return;
  const users = await db.user.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true, locale: true } });
  const byLocale = new Map<string, string[]>();
  for (const u of users) {
    const l = isLocale(u.locale) ? u.locale : DEFAULT_LOCALE;
    byLocale.set(l, [...(byLocale.get(l) ?? []), u.id]);
  }
  for (const [locale, group] of byLocale) {
    const t = await getTranslations({ locale, namespace: "events" });
    const { title, body } = build(t);
    await notifyUsers(group, { type, title, body, link });
  }
}

/** Login accounts of a member's guardians (or of the member itself when it has one). */
export async function guardianUserIds(memberId: string) {
  const [links, self] = await Promise.all([
    db.guardianship.findMany({ where: { childId: memberId }, select: { parent: { select: { userId: true } } } }),
    db.member.findUnique({ where: { id: memberId }, select: { userId: true, type: true } }),
  ]);
  const ids = links.map((l) => l.parent.userId).filter((x): x is string => !!x);
  // Adult members (no guardians) are notified directly; children keep their own account notified too.
  if (self?.userId) ids.push(self.userId);
  return ids;
}

export async function roleUserIds(roleKeys: string[]) {
  const users = await db.user.findMany({ where: { isActive: true, roles: { some: { role: { key: { in: roleKeys } } } } }, select: { id: true } });
  return users.map((u) => u.id);
}

import { Bell, Building2, CreditCard, Inbox, KeyRound, ScrollText, Tags, Users, type LucideIcon } from "lucide-react";
import type { Permission } from "@onet/shared";

export type SettingsSection = { key: string; href: string; icon: LucideIcon; perm: Permission; color: string };

/** Settings sub-navigation. Each page re-checks its permission on the server. */
export const SETTINGS_SECTIONS: SettingsSection[] = [
  { key: "organization", href: "/dashboard/settings/organization", icon: Building2, perm: "settings.manage", color: "#E30613" },
  { key: "users", href: "/dashboard/settings/users", icon: Users, perm: "users.manage", color: "#1E9BD7" },
  { key: "roles", href: "/dashboard/settings/roles", icon: KeyRound, perm: "roles.manage", color: "#7C4DFF" },
  { key: "notifications", href: "/dashboard/settings/notifications", icon: Bell, perm: "settings.manage", color: "#FFB400" },
  { key: "payments", href: "/dashboard/settings/payments", icon: CreditCard, perm: "settings.manage", color: "#2BB673" },
  { key: "categories", href: "/dashboard/settings/categories", icon: Tags, perm: "settings.manage", color: "#E8457C" },
  { key: "audit", href: "/dashboard/settings/audit", icon: ScrollText, perm: "audit.read", color: "#4A4360" },
  { key: "contact", href: "/dashboard/settings/contact", icon: Inbox, perm: "settings.manage", color: "#00A3A3" },
];

export function allowedSections(perms: Iterable<string>) {
  const set = new Set(perms);
  return SETTINGS_SECTIONS.filter((s) => set.has(s.perm));
}

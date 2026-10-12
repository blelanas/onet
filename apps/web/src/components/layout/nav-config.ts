import {
  BadgeDollarSign,
  BarChart3,
  Baby,
  Bell,
  BookOpen,
  Bus,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Gamepad2,
  HeartHandshake,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Mic2,
  Music,
  PartyPopper,
  Receipt,
  Settings,
  Shapes,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Permission, RoleKey } from "@onet/shared";

export type NavCtx = { perms: Set<string>; roles: RoleKey[] };
export type NavItem = { key: string; href: string; icon: LucideIcon; when: (c: NavCtx) => boolean; exact?: boolean };
export type NavSection = { key: string; items: NavItem[] };

const p = (...perms: Permission[]) => (c: NavCtx) => perms.every((x) => c.perms.has(x));
const isParent = (c: NavCtx) => c.roles.includes("parent");
const isKid = (c: NavCtx) => c.roles.includes("kid") && c.roles.length === 1;
const notKid = (c: NavCtx) => !isKid(c);

/**
 * Sidebar structure. Labels: messages/<locale>/nav.json → "sections.<key>" / "items.<key>".
 * `when` only hides UI; every page re-checks permissions on the server.
 */
export const NAV: NavSection[] = [
  {
    key: "main",
    items: [
      { key: "dashboard", href: "/dashboard", icon: LayoutDashboard, when: p("dashboard.view"), exact: true },
      { key: "myChildren", href: "/dashboard/my-children", icon: HeartHandshake, when: isParent },
      { key: "achievements", href: "/dashboard/achievements", icon: Trophy, when: isKid },
    ],
  },
  {
    key: "people",
    items: [
      { key: "members", href: "/dashboard/members", icon: Users, when: p("members.read_all") },
      { key: "children", href: "/dashboard/children", icon: Baby, when: (c) => c.perms.has("members.read") && !isParent(c) },
      { key: "parents", href: "/dashboard/parents", icon: UsersRound, when: p("members.read_all") },
      { key: "monitors", href: "/dashboard/monitors", icon: ShieldCheck, when: p("members.read_all") },
      { key: "groups", href: "/dashboard/groups", icon: Shapes, when: p("groups.read") },
      { key: "joinRequests", href: "/dashboard/join-requests", icon: UserPlus, when: p("members.manage") },
      { key: "approvals", href: "/dashboard/approvals", icon: UserCheck, when: p("users.approve") },
    ],
  },
  {
    key: "activities",
    items: [
      { key: "activities", href: "/dashboard/activities", icon: Sparkles, when: p("activities.read") },
      { key: "attendance", href: "/dashboard/attendance", icon: ClipboardCheck, when: (c) => c.perms.has("attendance.read") && notKid(c) },
      { key: "calendar", href: "/dashboard/calendar", icon: CalendarDays, when: p("calendar.read") },
    ],
  },
  {
    key: "events",
    items: [
      { key: "events", href: "/dashboard/events", icon: PartyPopper, when: p("events.read") },
      { key: "trips", href: "/dashboard/trips", icon: Bus, when: p("trips.read") },
      { key: "registrations", href: "/dashboard/registrations", icon: ClipboardCheck, when: (c) => c.perms.has("registrations.manage") || c.perms.has("events.register") || c.perms.has("trips.register") },
    ],
  },
  {
    key: "content",
    items: [
      { key: "songs", href: "/dashboard/content/songs", icon: Music, when: p("content.read") },
      { key: "games", href: "/dashboard/content/games", icon: Gamepad2, when: p("content.read") },
      { key: "conferences", href: "/dashboard/content/conferences", icon: Mic2, when: (c) => c.perms.has("content.read") },
      { key: "resources", href: "/dashboard/content/resources", icon: BookOpen, when: (c) => c.perms.has("content.read") && notKid(c) },
    ],
  },
  {
    key: "finance",
    items: [
      { key: "invoices", href: "/dashboard/finance/invoices", icon: Receipt, when: (c) => c.perms.has("finance.read") || c.perms.has("invoices.pay") },
      { key: "payments", href: "/dashboard/finance/payments", icon: Wallet, when: (c) => c.perms.has("finance.read") || c.perms.has("invoices.pay") },
      { key: "expenses", href: "/dashboard/finance/expenses", icon: BadgeDollarSign, when: p("finance.read") },
      { key: "financeReports", href: "/dashboard/finance/reports", icon: BarChart3, when: p("finance.read") },
    ],
  },
  {
    key: "communication",
    items: [
      { key: "announcements", href: "/dashboard/announcements", icon: Megaphone, when: p("announcements.read") },
      { key: "messages", href: "/dashboard/messages", icon: MessageCircle, when: p("messages.use") },
      { key: "notifications", href: "/dashboard/notifications", icon: Bell, when: notKid },
      { key: "documents", href: "/dashboard/documents", icon: FileText, when: p("documents.read") },
    ],
  },
  {
    key: "admin",
    items: [
      { key: "reports", href: "/dashboard/reports", icon: BarChart3, when: (c) => c.perms.has("reports.read") && c.perms.has("members.read_all") },
      { key: "settings", href: "/dashboard/settings", icon: Settings, when: (c) => c.perms.has("settings.manage") || c.perms.has("users.manage") || c.perms.has("roles.manage") },
    ],
  },
];

/** Bottom tab bar on phones: 4 most useful destinations per profile (+ "More"). */
export function mobileTabs(c: NavCtx): string[] {
  if (isKid(c)) return ["dashboard", "activities", "songs", "achievements"];
  if (isParent(c)) return ["dashboard", "myChildren", "events", "invoices"];
  if (c.roles.includes("accountant") && !c.roles.includes("admin") && !c.roles.includes("super_admin")) return ["dashboard", "invoices", "payments", "financeReports"];
  if (c.roles.includes("monitor") && !c.roles.includes("admin") && !c.roles.includes("super_admin")) return ["dashboard", "children", "attendance", "calendar"];
  return ["dashboard", "members", "events", "invoices"];
}

export function visibleNav(c: NavCtx): NavSection[] {
  return NAV.map((s) => ({ ...s, items: s.items.filter((i) => i.when(c)) })).filter((s) => s.items.length);
}

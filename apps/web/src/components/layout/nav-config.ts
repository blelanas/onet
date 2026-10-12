import {
  Backpack,
  BadgeDollarSign,
  BarChart3,
  Baby,
  Bell,
  BookOpen,
  Bus,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Footprints,
  Gamepad2,
  HeartHandshake,
  House,
  Megaphone,
  MessagesSquare,
  Mic2,
  Music,
  PartyPopper,
  Receipt,
  Settings,
  Shapes,
  ShieldCheck,
  Smile,
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
const isStaff = (c: NavCtx) => c.roles.some((r) => r === "super_admin" || r === "admin" || r === "accountant");
/** Members and monitors (the animators) without a staff role: the member-centred navigation. */
const isAnimator = (c: NavCtx) => !isStaff(c) && (c.roles.includes("member") || c.roles.includes("monitor"));

/**
 * Sidebar structure, member-centred: Home, Events (editions, kids, groups), Trips, Communication and
 * the Baggage (songs, dances, games), then the staff sections. Parent / kid spaces only show for users
 * who actually have that role. Labels: messages/<locale>/nav.json → "sections.<key>" / "items.<key>".
 * `when` only hides UI; every page re-checks permissions on the server.
 */
export const NAV: NavSection[] = [
  {
    key: "main",
    items: [
      { key: "dashboard", href: "/dashboard", icon: House, when: p("dashboard.view"), exact: true },
      { key: "myChildren", href: "/dashboard/my-children", icon: HeartHandshake, when: isParent },
      { key: "achievements", href: "/dashboard/achievements", icon: Trophy, when: isKid },
    ],
  },
  {
    key: "events",
    items: [
      { key: "events", href: "/dashboard/events", icon: PartyPopper, when: p("events.read") },
      { key: "kids", href: "/dashboard/kids", icon: Smile, when: (c) => c.perms.has("members.read") && !isParent(c) },
      { key: "teams", href: "/dashboard/teams", icon: Users, when: (c) => c.perms.has("events.read") && notKid(c) && !isParent(c) },
      {
        key: "registrations",
        href: "/dashboard/registrations",
        icon: ClipboardCheck,
        // Family registrations: parents only; the console: registration managers.
        when: (c) => c.perms.has("registrations.manage") || (isParent(c) && (c.perms.has("events.register") || c.perms.has("trips.register"))),
      },
    ],
  },
  {
    key: "trips",
    items: [{ key: "trips", href: "/dashboard/trips", icon: Bus, when: p("trips.read") }],
  },
  {
    key: "communication",
    items: [
      { key: "announcements", href: "/dashboard/announcements", icon: Megaphone, when: p("announcements.read") },
      { key: "messages", href: "/dashboard/messages", icon: MessagesSquare, when: p("messages.use") },
      { key: "notifications", href: "/dashboard/notifications", icon: Bell, when: notKid },
      { key: "documents", href: "/dashboard/documents", icon: FileText, when: p("documents.read") },
    ],
  },
  {
    key: "baggage",
    items: [
      { key: "songs", href: "/dashboard/content/songs", icon: Music, when: p("content.read") },
      { key: "dances", href: "/dashboard/content/dances", icon: Footprints, when: p("content.read") },
      { key: "games", href: "/dashboard/content/games", icon: Gamepad2, when: p("content.read") },
      { key: "conferences", href: "/dashboard/content/conferences", icon: Mic2, when: (c) => c.perms.has("content.read") && isStaff(c) },
      { key: "resources", href: "/dashboard/content/resources", icon: BookOpen, when: (c) => c.perms.has("content.read") && isStaff(c) },
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
    key: "people",
    items: [
      { key: "members", href: "/dashboard/members", icon: Users, when: p("members.read_all") },
      // Animators reach the kids through Events → Kids; the children directory is the staff one.
      { key: "children", href: "/dashboard/children", icon: Baby, when: (c) => c.perms.has("members.read") && !isParent(c) && !isAnimator(c) },
      { key: "parents", href: "/dashboard/parents", icon: UsersRound, when: (c) => c.perms.has("members.read_all") && isParent(c) },
      { key: "monitors", href: "/dashboard/monitors", icon: ShieldCheck, when: p("members.read_all") },
      { key: "groups", href: "/dashboard/groups", icon: Shapes, when: p("groups.read") },
      { key: "joinRequests", href: "/dashboard/join-requests", icon: UserPlus, when: p("members.manage") },
      { key: "approvals", href: "/dashboard/approvals", icon: UserCheck, when: p("users.approve") },
    ],
  },
  {
    key: "finance",
    items: [
      // Family finance (invoices.pay) is for parents only.
      { key: "invoices", href: "/dashboard/finance/invoices", icon: Receipt, when: (c) => c.perms.has("finance.read") || (isParent(c) && c.perms.has("invoices.pay")) },
      { key: "payments", href: "/dashboard/finance/payments", icon: Wallet, when: (c) => c.perms.has("finance.read") || (isParent(c) && c.perms.has("invoices.pay")) },
      { key: "expenses", href: "/dashboard/finance/expenses", icon: BadgeDollarSign, when: p("finance.read") },
      { key: "financeReports", href: "/dashboard/finance/reports", icon: BarChart3, when: p("finance.read") },
    ],
  },
  {
    key: "admin",
    items: [
      { key: "reports", href: "/dashboard/reports", icon: BarChart3, when: (c) => c.perms.has("reports.read") && c.perms.has("members.read_all") },
      {
        key: "settings",
        href: "/dashboard/settings",
        icon: Settings,
        // content.manage: the local bureau page (Settings → Local bureau).
        when: (c) => c.perms.has("settings.manage") || c.perms.has("users.manage") || c.perms.has("roles.manage") || c.perms.has("content.manage"),
      },
    ],
  },
];

/**
 * Bottom tabs that stand for a whole section rather than one sidebar item: they open `item` (when the
 * user can see it), are labelled `label` (nav.json) and are active anywhere under `prefix`.
 */
export const TAB_ALIASES: Record<string, { item: string; label: string; prefix: string; icon: LucideIcon }> = {
  baggage: { item: "songs", label: "sections.baggage", prefix: "/dashboard/content", icon: Backpack },
};

/** Bottom tab bar on phones: 4 most useful destinations per profile (+ "More"). */
export function mobileTabs(c: NavCtx): string[] {
  if (isKid(c)) return ["dashboard", "activities", "songs", "achievements"];
  if (isParent(c) && !isStaff(c) && !isAnimator(c)) return ["dashboard", "myChildren", "events", "invoices"];
  if (c.roles.includes("accountant") && !c.roles.includes("admin") && !c.roles.includes("super_admin")) return ["dashboard", "invoices", "payments", "financeReports"];
  if (isAnimator(c)) return ["dashboard", "events", "messages", "baggage"];
  return ["dashboard", "members", "events", "invoices"];
}

export function visibleNav(c: NavCtx): NavSection[] {
  return NAV.map((s) => ({ ...s, items: s.items.filter((i) => i.when(c)) })).filter((s) => s.items.length);
}

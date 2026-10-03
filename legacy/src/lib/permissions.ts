// Permission catalog + default role grants.
// The DB (Role / Permission / RolePermission) is the source of truth at runtime; this file
// seeds it and gives TypeScript a closed set of keys. To add a permission: add it here,
// re-run the seed (or create it from Settings → Roles), and guard the code with requirePermission().

export const PERMISSIONS = {
  "dashboard.view": "dashboard",

  "users.read": "users",
  "users.manage": "users",
  "roles.manage": "users",

  "members.read": "people", // scoped: own children / own groups unless members.read_all
  "members.read_all": "people",
  "members.manage": "people",
  "members.export": "people",

  "groups.read": "groups",
  "groups.manage": "groups",

  "activities.read": "activities",
  "activities.manage": "activities",
  "attendance.read": "attendance", // scoped like members.read
  "attendance.manage": "attendance",
  "calendar.read": "calendar",
  "calendar.manage": "calendar",

  "events.read": "events",
  "events.manage": "events",
  "events.register": "events",
  "trips.read": "trips",
  "trips.manage": "trips",
  "trips.register": "trips",
  "registrations.manage": "events",

  "content.read": "content",
  "content.manage": "content",

  "finance.read": "finance",
  "finance.manage": "finance",
  "invoices.pay": "finance", // pay own invoices (parents)

  "reports.read": "reports",

  "announcements.read": "communication",
  "announcements.manage": "communication",
  "messages.use": "communication",
  "notifications.manage": "communication",

  "documents.read": "documents", // scoped
  "documents.manage": "documents",

  "tasks.manage": "tasks",
  "settings.manage": "settings",
  "audit.read": "settings",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export const ROLE_KEYS = ["super_admin", "admin", "accountant", "monitor", "parent", "member", "kid"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

const COMMON: Permission[] = ["dashboard.view", "calendar.read", "announcements.read", "content.read"];

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleKey, Permission[]> = {
  super_admin: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS.filter((p) => !["roles.manage", "finance.manage", "audit.read"].includes(p)),
  accountant: [
    ...COMMON,
    "members.read",
    "members.read_all",
    "events.read",
    "trips.read",
    "finance.read",
    "finance.manage",
    "reports.read",
    "messages.use",
    "documents.read",
  ],
  monitor: [
    ...COMMON,
    "members.read",
    "groups.read",
    "activities.read",
    "activities.manage",
    "attendance.read",
    "attendance.manage",
    "events.read",
    "trips.read",
    "messages.use",
    "documents.read",
    "tasks.manage",
  ],
  parent: [
    ...COMMON,
    "members.read",
    "activities.read",
    "attendance.read",
    "events.read",
    "events.register",
    "trips.read",
    "trips.register",
    "invoices.pay",
    "messages.use",
    "documents.read",
  ],
  member: [...COMMON, "activities.read", "events.read", "events.register", "trips.read", "messages.use", "documents.read"],
  kid: [...COMMON, "activities.read", "events.read", "trips.read"],
};

export const ROLE_COLORS: Record<RoleKey, string> = {
  super_admin: "#E30613",
  admin: "#FF6B4A",
  accountant: "#2BB673",
  monitor: "#1E9BD7",
  parent: "#7C4DFF",
  member: "#00A3A3",
  kid: "#FFB400",
};

/** Which dashboard flavour a user sees (first match wins). */
export const DASHBOARD_PRIORITY: RoleKey[] = ["super_admin", "admin", "accountant", "monitor", "parent", "kid", "member"];

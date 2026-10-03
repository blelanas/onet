import type { RouteObject } from "react-router";

/** settings pages — paths are relative to /dashboard. Layout route (sub-nav + <Outlet/>) with one lazy chunk per section. */
export const routes: RouteObject[] = [
  {
    path: "settings",
    lazy: () => import("./layout"),
    children: [
      { index: true, lazy: () => import("./layout").then((m) => ({ Component: m.SettingsIndex })) },
      { path: "organization", lazy: () => import("./organization") },
      { path: "users", lazy: () => import("./users") },
      { path: "roles", lazy: () => import("./roles") },
      { path: "notifications", lazy: () => import("./notifications") },
      { path: "payments", lazy: () => import("./payments") },
      { path: "categories", lazy: () => import("./categories") },
      { path: "audit", lazy: () => import("./audit") },
      { path: "contact", lazy: () => import("./contact") },
    ],
  },
];

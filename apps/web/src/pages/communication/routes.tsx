import type { RouteObject } from "react-router";

/** communication pages — paths are relative to /dashboard. Use lazy() so each page is its own chunk. */
export const routes: RouteObject[] = [
  { path: "announcements", lazy: () => import("./announcements") },
  { path: "messages", lazy: () => import("./messages") },
  { path: "notifications", lazy: () => import("./notifications") },
  { path: "notifications/open/:id", lazy: () => import("./notification-open") },
];

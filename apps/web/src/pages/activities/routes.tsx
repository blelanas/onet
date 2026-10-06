import type { RouteObject } from "react-router";

/** activities pages — paths are relative to /dashboard. Use lazy() so each page is its own chunk. */
export const routes: RouteObject[] = [
  { path: "activities", lazy: () => import("./activities-list") },
  { path: "activities/new", lazy: () => import("./activity-new") },
  { path: "activities/:id", lazy: () => import("./activity-detail") },
  { path: "activities/:id/edit", lazy: () => import("./activity-edit") },
];

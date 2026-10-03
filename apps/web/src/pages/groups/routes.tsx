import type { RouteObject } from "react-router";

/** groups pages — paths are relative to /dashboard. Use lazy() so each page is its own chunk. */
export const routes: RouteObject[] = [
  { path: "groups", lazy: () => import("./groups-list") },
  { path: "groups/new", lazy: () => import("./group-new") },
  { path: "groups/:id", lazy: () => import("./group-detail") },
  { path: "groups/:id/edit", lazy: () => import("./group-edit") },
];

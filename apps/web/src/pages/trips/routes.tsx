import type { RouteObject } from "react-router";

/** trips pages — paths are relative to /dashboard. Use lazy() so each page is its own chunk. */
export const routes: RouteObject[] = [
  { path: "trips", lazy: () => import("./trips-list") },
  { path: "trips/new", lazy: () => import("./trip-new") },
  { path: "trips/:id", lazy: () => import("./trip-detail") },
  { path: "trips/:id/edit", lazy: () => import("./trip-edit") },
];

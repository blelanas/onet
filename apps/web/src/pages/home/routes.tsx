import type { RouteObject } from "react-router";

/** home pages — paths are relative to /dashboard. Use lazy() so each page is its own chunk. */
export const routes: RouteObject[] = [
  { index: true, lazy: () => import("./dashboard-page") },
  { path: "my-children", lazy: () => import("./my-children") },
  { path: "achievements", lazy: () => import("./achievements") },
  { path: "profile", lazy: () => import("./profile") },
  { path: "search", lazy: () => import("./search") },
  { path: "join-requests", lazy: () => import("./join-requests") },
];

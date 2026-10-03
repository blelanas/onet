import type { RouteObject } from "react-router";

/** events pages — paths are relative to /dashboard. Use lazy() so each page is its own chunk. */
export const routes: RouteObject[] = [
  { path: "events", lazy: () => import("./events-list") },
  { path: "events/new", lazy: () => import("./event-new") },
  { path: "events/:id", lazy: () => import("./event-detail") },
  { path: "events/:id/edit", lazy: () => import("./event-edit") },
];

import type { RouteObject } from "react-router";

/** calendar pages — paths are relative to /dashboard. Use lazy() so each page is its own chunk. */
export const routes: RouteObject[] = [{ path: "calendar", lazy: () => import("./calendar-page") }];

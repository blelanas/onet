import type { RouteObject } from "react-router";

/** registrations pages — paths are relative to /dashboard. Use lazy() so each page is its own chunk. */
export const routes: RouteObject[] = [{ path: "registrations", lazy: () => import("./registrations-page") }];

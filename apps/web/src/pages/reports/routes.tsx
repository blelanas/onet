import type { RouteObject } from "react-router";

/** reports pages — paths are relative to /dashboard. Use lazy() so each page is its own chunk. */
export const routes: RouteObject[] = [{ path: "reports", lazy: () => import("./reports") }];

import type { RouteObject } from "react-router";

/** kids pages — paths are relative to /dashboard. */
export const routes: RouteObject[] = [{ path: "kids", lazy: () => import("./kids-list") }];

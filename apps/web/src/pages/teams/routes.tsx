import type { RouteObject } from "react-router";

/** teams pages — paths are relative to /dashboard. */
export const routes: RouteObject[] = [{ path: "teams", lazy: () => import("./my-teams") }];

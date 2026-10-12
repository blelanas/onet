import type { RouteObject } from "react-router";
import { DirectoryPage } from "./directory-page";

/** people pages — paths are relative to /dashboard. */
export const routes: RouteObject[] = [
  { path: "members", element: <DirectoryPage kind="members" /> },
  { path: "children", element: <DirectoryPage kind="children" /> },
  { path: "parents", element: <DirectoryPage kind="parents" /> },
  { path: "monitors", element: <DirectoryPage kind="monitors" /> },
  { path: "members/new", lazy: () => import("./member-new") },
  { path: "members/:id", lazy: () => import("./member-profile") },
  { path: "members/:id/edit", lazy: () => import("./member-edit") },
  { path: "approvals", lazy: () => import("./approvals") },
];

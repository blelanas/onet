import type { RouteObject } from "react-router";
import { useNavigate } from "react-router";
import { PublicError } from "@/components/public/states";

/** Render errors inside the public layout (was app/(public)/error.tsx). */
function RouteError() {
  const navigate = useNavigate();
  return <PublicError reset={() => navigate(0)} />;
}

/** Public website routes (rendered inside the public layout, see ./layout.tsx). */
export const publicRoutes: RouteObject[] = [
  {
    errorElement: <RouteError />,
    children: [
      { index: true, lazy: () => import("./home") },
      { path: "about", lazy: () => import("./about") },
      { path: "activities", lazy: () => import("./activities") },
      { path: "events", lazy: () => import("./events") },
      { path: "events/:id", lazy: () => import("./event-detail") },
      { path: "trips", lazy: () => import("./trips") },
      { path: "trips/:id", lazy: () => import("./trip-detail") },
      { path: "news", lazy: () => import("./news") },
      { path: "news/:slug", lazy: () => import("./news-article") },
      { path: "gallery", lazy: () => import("./gallery") },
      { path: "songs", lazy: () => import("./songs") },
      { path: "conferences", lazy: () => import("./conferences") },
      { path: "contact", lazy: () => import("./contact") },
      { path: "join", lazy: () => import("./join") },
    ],
  },
  // Unknown public URLs: branded, standalone 404 (no header/footer, like app/not-found.tsx).
  { path: "*", handle: { bare: true }, lazy: () => import("./not-found") },
];

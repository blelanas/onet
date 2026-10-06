import { Navigate, type RouteObject } from "react-router";

/** content pages — paths are relative to /dashboard. Every page shares the layout hosting the mini-player. */
export const routes: RouteObject[] = [
  {
    path: "content",
    lazy: () => import("./layout"),
    children: [
      { index: true, element: <Navigate to="songs" replace /> },
      { path: "songs", lazy: () => import("./songs-list") },
      { path: "songs/new", lazy: () => import("./song-new") },
      { path: "songs/:id", lazy: () => import("./song-detail") },
      { path: "songs/:id/edit", lazy: () => import("./song-edit") },
      { path: "games", lazy: () => import("./games-list") },
      { path: "games/new", lazy: () => import("./game-new") },
      { path: "games/:id", lazy: () => import("./game-detail") },
      { path: "games/:id/edit", lazy: () => import("./game-edit") },
      { path: "games/:id/animate", lazy: () => import("./game-animate") },
      { path: "conferences", lazy: () => import("./conferences-list") },
      { path: "conferences/new", lazy: () => import("./conference-new") },
      { path: "conferences/:id", lazy: () => import("./conference-detail") },
      { path: "conferences/:id/edit", lazy: () => import("./conference-edit") },
      { path: "resources", lazy: () => import("./resources") },
    ],
  },
];

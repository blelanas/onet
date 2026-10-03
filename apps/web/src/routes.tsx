import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, type RouteObject } from "react-router";
import { RequireAuth } from "@/components/states/guards";
import { NotFound } from "@/components/states/page-state";
import { PageSkeleton } from "@/components/ui/skeleton";
import { routes as home } from "@/pages/home/routes";
import { routes as people } from "@/pages/people/routes";
import { routes as groups } from "@/pages/groups/routes";
import { routes as activities } from "@/pages/activities/routes";
import { routes as attendance } from "@/pages/attendance/routes";
import { routes as calendar } from "@/pages/calendar/routes";
import { routes as events } from "@/pages/events/routes";
import { routes as trips } from "@/pages/trips/routes";
import { routes as registrations } from "@/pages/registrations/routes";
import { routes as content } from "@/pages/content/routes";
import { routes as finance } from "@/pages/finance/routes";
import { routes as communication } from "@/pages/communication/routes";
import { routes as documents } from "@/pages/documents/routes";
import { routes as reports } from "@/pages/reports/routes";
import { routes as settings } from "@/pages/settings/routes";
import { publicRoutes } from "@/pages/public/routes";

const DashboardLayoutLazy = lazy(() => import("@/pages/dashboard-shell/layout"));

const dashboardChildren: RouteObject[] = [
  ...home,
  ...people,
  ...groups,
  ...activities,
  ...attendance,
  ...calendar,
  ...events,
  ...trips,
  ...registrations,
  ...content,
  ...finance,
  ...communication,
  ...documents,
  ...reports,
  ...settings,
  { path: "forbidden", lazy: async () => ({ Component: (await import("@/components/states/page-state")).Forbidden }) },
  { path: "*", element: <NotFound /> },
];

export const router = createBrowserRouter([
  { path: "/login", lazy: () => import("@/pages/login") },
  {
    path: "/dashboard",
    element: (
      <RequireAuth>
        <Suspense fallback={<div className="p-6"><PageSkeleton /></div>}>
          <DashboardLayoutLazy />
        </Suspense>
      </RequireAuth>
    ),
    children: dashboardChildren,
  },
  publicRoutes.length
    ? { path: "/", lazy: () => import("@/pages/public/layout"), children: publicRoutes }
    : { path: "/", element: <Navigate to="/login" replace /> },
]);

import type { RouteObject } from "react-router";
import { Navigate } from "@/lib/router";

/** finance pages — paths are relative to /dashboard. Use lazy() so each page is its own chunk. */
export const routes: RouteObject[] = [
  { path: "finance", element: <Navigate to="/dashboard/finance/invoices" replace /> },
  { path: "finance/invoices", lazy: () => import("./invoices") },
  { path: "finance/invoices/new", lazy: () => import("./invoice-new") },
  { path: "finance/invoices/:id", lazy: () => import("./invoice-detail") },
  { path: "finance/invoices/:id/edit", lazy: () => import("./invoice-edit") },
  { path: "finance/payments", lazy: () => import("./payments") },
  { path: "finance/expenses", lazy: () => import("./expenses") },
  { path: "finance/reports", lazy: () => import("./reports") },
];

import "server-only";
import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/guards";
import type { CurrentUser } from "@/lib/auth/session";
import { requireFinance } from "./access";

/** Route-handler guard for CSV exports (finance staff only). */
export async function exportGuard(): Promise<{ user: CurrentUser } | NextResponse> {
  try {
    const { user } = await requireFinance({ staffOnly: true });
    return { user };
  } catch (e) {
    if (e instanceof AuthError) {
      const unauth = e.code === "UNAUTHENTICATED";
      return NextResponse.json({ error: unauth ? "errors.unauthenticated" : "errors.forbidden" }, { status: unauth ? 401 : 403 });
    }
    throw e;
  }
}

/** Plain decimal TND for spreadsheets (e.g. 12.5). */
export const csvTnd = (millimes: number) => (millimes / 1000).toFixed(3);

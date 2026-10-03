import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { csvResponse } from "@/lib/csv";
import { toDateInput } from "@/lib/dates";
import { listExpenses } from "@/server/finance/expenses";
import { csvTnd, exportGuard } from "@/server/finance/export";
import { resolvePeriod } from "@/server/finance/period";

export async function GET(req: Request) {
  const g = await exportGuard();
  if (g instanceof NextResponse) return g;
  const sp = new URL(req.url).searchParams;
  const { rows } = await listExpenses({ q: sp.get("q") ?? undefined, category: sp.get("category") ?? undefined, link: sp.get("link") ?? undefined, period: resolvePeriod(sp) });
  await audit(g.user.id, "export", "Expense", null, { count: rows.length });
  const origin = new URL(req.url).origin;
  return csvResponse(`onet-depenses-${toDateInput(new Date())}.csv`, [
    ["date", "category", "description", "supplier", "amountTND", "event", "trip", "attachment", "createdBy"],
    ...rows.map((e) => [toDateInput(e.date), e.category, e.description, e.supplier, csvTnd(e.amount), e.event?.title, e.trip?.title, e.attachmentUrl ? `${origin}${e.attachmentUrl}` : "", e.createdBy?.name]),
  ]);
}

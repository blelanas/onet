import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { csvResponse } from "@/lib/csv";
import { toDateInput } from "@/lib/dates";
import { csvTnd, exportGuard } from "@/server/finance/export";
import { resolvePeriod } from "@/server/finance/period";
import { financialReport } from "@/server/finance/reports";

/** Monthly overview: revenue (completed payments), expenses and net per month + total row. */
export async function GET(req: Request) {
  const g = await exportGuard();
  if (g instanceof NextResponse) return g;
  const period = resolvePeriod(new URL(req.url).searchParams, "year");
  const r = await financialReport(period);
  await audit(g.user.id, "export", "FinanceReport", null, { period: period.key, from: toDateInput(period.from), to: toDateInput(period.to) });
  return csvResponse(`onet-bilan-mensuel-${toDateInput(new Date())}.csv`, [
    ["month", "revenueTND", "expensesTND", "netTND"],
    ...r.months.map((m) => [m.key, csvTnd(m.revenue), csvTnd(m.expenses), csvTnd(m.revenue - m.expenses)]),
    ["TOTAL", csvTnd(r.kpis.revenue), csvTnd(r.kpis.expenses), csvTnd(r.kpis.net)],
  ]);
}

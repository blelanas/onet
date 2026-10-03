import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { csvResponse } from "@/lib/csv";
import { toDateInput } from "@/lib/dates";
import { csvTnd, exportGuard } from "@/server/finance/export";
import { listPayments } from "@/server/finance/payments";
import { resolvePeriod } from "@/server/finance/period";

export async function GET(req: Request) {
  const g = await exportGuard();
  if (g instanceof NextResponse) return g;
  const sp = new URL(req.url).searchParams;
  const { rows } = await listPayments(g.user, { q: sp.get("q") ?? undefined, method: sp.get("method") ?? undefined, status: sp.get("status") ?? undefined, period: resolvePeriod(sp) });
  await audit(g.user.id, "export", "Payment", null, { count: rows.length });
  return csvResponse(`onet-paiements-${toDateInput(new Date())}.csv`, [
    ["paidAt", "invoice", "payer", "description", "method", "status", "amountTND", "reference", "provider", "recordedBy", "notes"],
    ...rows.map((p) => [
      p.paidAt.toISOString().slice(0, 16).replace("T", " "), p.invoice.number, `${p.invoice.payer.firstName} ${p.invoice.payer.lastName}`, p.invoice.description,
      p.method, p.status, csvTnd(p.amount), p.reference, p.provider, p.recordedBy?.name, p.notes,
    ]),
  ]);
}

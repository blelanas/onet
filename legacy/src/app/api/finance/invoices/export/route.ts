import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { csvResponse } from "@/lib/csv";
import { toDateInput } from "@/lib/dates";
import { csvTnd, exportGuard } from "@/server/finance/export";
import { resolvePeriod } from "@/server/finance/period";
import { INVOICE_TABS, listInvoices } from "@/server/finance/queries";

export async function GET(req: Request) {
  const g = await exportGuard();
  if (g instanceof NextResponse) return g;
  const sp = new URL(req.url).searchParams;
  const status = (INVOICE_TABS as readonly string[]).includes(sp.get("status") ?? "") ? sp.get("status")! : "all";
  const { rows } = await listInvoices(g.user, { q: sp.get("q") ?? undefined, status, link: sp.get("link") ?? undefined, period: resolvePeriod(sp) });
  await audit(g.user.id, "export", "Invoice", null, { count: rows.length });
  return csvResponse(`onet-factures-${toDateInput(new Date())}.csv`, [
    ["number", "issuedAt", "dueDate", "status", "payer", "child", "description", "event", "trip", "activity", "amountTND", "paidTND", "remainingTND", "paidAt"],
    ...rows.map((r) => [
      r.number, toDateInput(r.issuedAt), toDateInput(r.dueDate), r.status, `${r.payer.firstName} ${r.payer.lastName}`, r.child ? `${r.child.firstName} ${r.child.lastName}` : "",
      r.description, r.event?.title, r.trip?.title, r.activity?.title, csvTnd(r.amount), csvTnd(r.paid), csvTnd(r.status === "CANCELLED" ? 0 : r.remaining), toDateInput(r.paidAt),
    ]),
  ]);
}

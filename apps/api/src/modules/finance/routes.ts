import { Router, type Request } from "express";
import { audit } from "@api/lib/audit";
import { AuthError } from "@api/lib/auth/guards";
import { mutation, param, qs, query, searchParams, sendCsv } from "@api/lib/http";
import { sweepOverdue } from "@api/lib/services/invoices";
import { toCsv, toDateInput } from "@onet/shared";
import { canManageFinance, requireFinance, requireFinancePage } from "./access";
import { cancelInvoice, payInvoiceOnline, recordPayment, refundPayment, saveInvoice, setInvoiceStatus } from "./actions";
import { deleteExpense, saveExpense } from "./expense-actions";
import { expenseLinkOptions, listExpenses } from "./expenses";
import { csvTnd } from "./export";
import { listPayments } from "./payments";
import { resolvePeriod } from "./period";
import { bankInfo, familyInvoices, getInvoice, INVOICE_TABS, invoiceFormOptions, linkFilterOptions, listInvoices, orgProfile } from "./queries";
import { financialReport } from "./reports";

/** finance module routes (mounted under /api). */
export const router = Router();

function pageOf(req: Request, size: number) {
  const page = Math.max(1, Number(qs(req, "page")) || 1);
  return { page, pageSize: size, skip: (page - 1) * size, take: size };
}

function invoiceStatusParam(req: Request) {
  const s = qs(req, "status");
  return (INVOICE_TABS as readonly string[]).includes(s ?? "") ? s! : "all";
}

/** CSV exports are for finance staff only (families and kids get 403). */
async function exportUser() {
  const { user } = await requireFinance({ staffOnly: true });
  return user;
}

// ── Invoices ──

/** /dashboard/finance/invoices: staff list (tabs, totals, filters) or the family view. */
export async function invoicesPage(req: Request) {
  const { user, mode } = await requireFinancePage();
  await sweepOverdue();
  if (mode === "family") {
    return { mode: "family" as const, manage: false, family: await familyInvoices(user), list: null };
  }
  const status = invoiceStatusParam(req);
  const { page, pageSize, skip, take } = pageOf(req, 15);
  const [list, links] = await Promise.all([
    listInvoices(user, { q: qs(req, "q"), status, link: qs(req, "link"), period: resolvePeriod(searchParams(req)), skip, take }),
    linkFilterOptions(),
  ]);
  return { mode: "staff" as const, manage: canManageFinance(user), family: null, list: { ...list, status, page, pageSize, links } };
}
router.get("/finance/invoices", query(invoicesPage));

router.get(
  "/finance/invoices/export.csv",
  query(async (req, res) => {
    const user = await exportUser();
    const { rows } = await listInvoices(user, { q: qs(req, "q"), status: invoiceStatusParam(req), link: qs(req, "link"), period: resolvePeriod(searchParams(req)) });
    await audit(user.id, "export", "Invoice", null, { count: rows.length });
    sendCsv(
      res,
      `onet-factures-${toDateInput(new Date())}.csv`,
      toCsv([
        ["number", "issuedAt", "dueDate", "status", "payer", "child", "description", "event", "trip", "activity", "amountTND", "paidTND", "remainingTND", "paidAt"],
        ...rows.map((r) => [
          r.number,
          toDateInput(r.issuedAt),
          toDateInput(r.dueDate),
          r.status,
          `${r.payer.firstName} ${r.payer.lastName}`,
          r.child ? `${r.child.firstName} ${r.child.lastName}` : "",
          r.description,
          r.event?.title,
          r.trip?.title,
          r.activity?.title,
          csvTnd(r.amount),
          csvTnd(r.paid),
          csvTnd(r.status === "CANCELLED" ? 0 : r.remaining),
          toDateInput(r.paidAt),
        ]),
      ]),
    );
  }),
);

/** Options for the new-invoice form (finance managers only). */
export async function invoiceFormOptionsPage() {
  const { user } = await requireFinancePage({ staffOnly: true });
  if (!canManageFinance(user)) throw new AuthError("FORBIDDEN");
  return invoiceFormOptions();
}
router.get("/finance/invoices/options", query(invoiceFormOptionsPage));

/** Invoice detail (scoped: families only see their own). */
export async function invoicePage(req: Request) {
  const { user, mode } = await requireFinancePage();
  const inv = await getInvoice(user, param(req, "id"));
  const [org, bank] = await Promise.all([orgProfile(), bankInfo()]);
  return { inv, org, bank: mode === "family" ? bank : null, mode, manage: canManageFinance(user) };
}
router.get("/finance/invoices/:id", query(invoicePage));

/** Edit form data. `frozen` when the invoice has payments or is cancelled (→ back to detail). */
export async function invoiceFormPage(req: Request) {
  const { user } = await requireFinancePage({ staffOnly: true });
  if (!canManageFinance(user)) throw new AuthError("FORBIDDEN");
  const inv = await getInvoice(user, param(req, "id"));
  if (inv.paid > 0 || inv.status === "CANCELLED") return { frozen: true as const, inv: { id: inv.id, number: inv.number }, initial: null, options: null };
  const link = inv.eventId ? `event:${inv.eventId}` : inv.tripId ? `trip:${inv.tripId}` : inv.activityId ? `activity:${inv.activityId}` : undefined;
  return {
    frozen: false as const,
    inv: { id: inv.id, number: inv.number },
    initial: { id: inv.id, payerId: inv.payerId, childId: inv.childId, link, description: inv.description, amount: inv.amount, dueDate: inv.dueDate, notes: inv.notes, status: inv.status },
    options: await invoiceFormOptions(),
  };
}
router.get("/finance/invoices/:id/form", query(invoiceFormPage));

router.post("/finance/invoices", mutation((req) => saveInvoice(req.body)));
router.put("/finance/invoices/:id", mutation((req) => saveInvoice({ ...req.body, id: param(req, "id") })));
router.post("/finance/invoices/:id/status", mutation((req) => setInvoiceStatus(param(req, "id"), req.body?.status)));
router.post("/finance/invoices/:id/cancel", mutation((req) => cancelInvoice(param(req, "id"))));
router.post("/finance/invoices/:id/payments", mutation((req) => recordPayment({ ...req.body, invoiceId: param(req, "id") })));
router.post("/finance/invoices/:id/pay-online", mutation((req) => payInvoiceOnline(param(req, "id"))));

// ── Payments ──

export async function paymentsPage(req: Request) {
  const { user, mode } = await requireFinancePage();
  const family = mode === "family";
  const { page, pageSize, skip, take } = pageOf(req, family ? 30 : 20);
  const data = await listPayments(user, { q: qs(req, "q"), method: qs(req, "method"), status: qs(req, "status"), period: resolvePeriod(searchParams(req)), skip, take });
  return { ...data, page, pageSize, mode, manage: canManageFinance(user) };
}
router.get("/finance/payments", query(paymentsPage));

router.get(
  "/finance/payments/export.csv",
  query(async (req, res) => {
    const user = await exportUser();
    const { rows } = await listPayments(user, { q: qs(req, "q"), method: qs(req, "method"), status: qs(req, "status"), period: resolvePeriod(searchParams(req)) });
    await audit(user.id, "export", "Payment", null, { count: rows.length });
    sendCsv(
      res,
      `onet-paiements-${toDateInput(new Date())}.csv`,
      toCsv([
        ["paidAt", "invoice", "payer", "description", "method", "status", "amountTND", "reference", "provider", "recordedBy", "notes"],
        ...rows.map((p) => [
          p.paidAt.toISOString().slice(0, 16).replace("T", " "),
          p.invoice.number,
          `${p.invoice.payer.firstName} ${p.invoice.payer.lastName}`,
          p.invoice.description,
          p.method,
          p.status,
          csvTnd(p.amount),
          p.reference,
          p.provider,
          p.recordedBy?.name,
          p.notes,
        ]),
      ]),
    );
  }),
);

router.post("/finance/payments/:id/refund", mutation((req) => refundPayment(param(req, "id"))));

// ── Expenses ──

export async function expensesPage(req: Request) {
  const { user } = await requireFinancePage({ staffOnly: true });
  const manage = canManageFinance(user);
  const { page, pageSize, skip, take } = pageOf(req, 15);
  const [data, links, formLinks] = await Promise.all([
    listExpenses({ q: qs(req, "q"), category: qs(req, "category"), link: qs(req, "link"), period: resolvePeriod(searchParams(req)), skip, take }),
    linkFilterOptions(),
    manage ? expenseLinkOptions() : Promise.resolve({ events: [], trips: [] }),
  ]);
  return { ...data, page, pageSize, links, formLinks, manage };
}
router.get("/finance/expenses", query(expensesPage));

router.get(
  "/finance/expenses/export.csv",
  query(async (req, res) => {
    const user = await exportUser();
    const { rows } = await listExpenses({ q: qs(req, "q"), category: qs(req, "category"), link: qs(req, "link"), period: resolvePeriod(searchParams(req)) });
    await audit(user.id, "export", "Expense", null, { count: rows.length });
    const origin = `${req.protocol}://${req.get("host")}`;
    sendCsv(
      res,
      `onet-depenses-${toDateInput(new Date())}.csv`,
      toCsv([
        ["date", "category", "description", "supplier", "amountTND", "event", "trip", "attachment", "createdBy"],
        ...rows.map((e) => [toDateInput(e.date), e.category, e.description, e.supplier, csvTnd(e.amount), e.event?.title, e.trip?.title, e.attachmentUrl ? `${origin}${e.attachmentUrl}` : "", e.createdBy?.name]),
      ]),
    );
  }),
);

router.post("/finance/expenses", mutation((req) => saveExpense(req.body)));
router.put("/finance/expenses/:id", mutation((req) => saveExpense({ ...req.body, id: param(req, "id") })));
router.delete("/finance/expenses/:id", mutation((req) => deleteExpense(param(req, "id"))));

// ── Reports ──

export async function financeReportsPage(req: Request) {
  await requireFinancePage({ staffOnly: true });
  const period = resolvePeriod(searchParams(req), "year");
  return { period, report: await financialReport(period) };
}
router.get("/finance/reports", query(financeReportsPage));

router.get(
  "/finance/reports/export.csv",
  query(async (req, res) => {
    const user = await exportUser();
    const period = resolvePeriod(searchParams(req), "year");
    const r = await financialReport(period);
    await audit(user.id, "export", "FinanceReport", null, { period: period.key, from: toDateInput(period.from), to: toDateInput(period.to) });
    sendCsv(
      res,
      `onet-bilan-mensuel-${toDateInput(new Date())}.csv`,
      toCsv([
        ["month", "revenueTND", "expensesTND", "netTND"],
        ...r.months.map((m) => [m.key, csvTnd(m.revenue), csvTnd(m.expenses), csvTnd(m.revenue - m.expenses)]),
        ["TOTAL", csvTnd(r.kpis.revenue), csvTnd(r.kpis.expenses), csvTnd(r.kpis.net)],
      ]),
    );
  }),
);

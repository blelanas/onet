import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { AuthError } from "@api/lib/auth/guards";
import { ActionError } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { paidAmount } from "@api/lib/services/invoices";
import { settleInvoice } from "./settle";

/** Methods a person can record by hand (online payments come from the payment provider). */
export const MANUAL_PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CHECK", "OTHER"] as const;
export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];

/**
 * Records a manual payment on an invoice, the same way as `POST /finance/invoices/:id/payments`:
 * live invoice only, amount ≤ remaining balance, recorded by `user`, then `settleInvoice()` (status,
 * registration confirmation, payer + accountant notifications) and an audit entry.
 * Authorisation is the caller's job (finance.manage, or a trip manager for their trip's invoices).
 */
export async function recordManualPayment(
  user: CurrentUser,
  data: { invoiceId: string; amount: number; method: ManualPaymentMethod; reference?: string | null; paidAt?: Date | null; notes?: string | null },
) {
  const inv = await db.invoice.findUnique({ where: { id: data.invoiceId }, include: { payments: true } });
  if (!inv) throw new AuthError("NOT_FOUND");
  if (inv.status === "CANCELLED" || inv.status === "DRAFT") throw new ActionError("errors.validation");
  if (data.amount <= 0) throw new ActionError("errors.validation");
  const remaining = inv.amount - paidAmount(inv);
  if (data.amount > remaining) throw new ActionError("errors.amountTooHigh");
  const paidAt = data.paidAt && data.paidAt <= new Date() ? data.paidAt : new Date();
  const p = await db.payment.create({
    data: { invoiceId: inv.id, amount: data.amount, method: data.method, reference: data.reference ?? null, paidAt, notes: data.notes ?? null, provider: "manual", recordedById: user.id, status: "COMPLETED" },
  });
  const status = await settleInvoice(inv.id, { amount: data.amount, notify: true });
  await audit(user.id, "payment", "Invoice", inv.id, { paymentId: p.id, number: inv.number, amount: data.amount, method: data.method, status });
  return { paymentId: p.id, status, remaining: remaining - data.amount };
}

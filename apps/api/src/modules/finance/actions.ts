import { revalidatePath } from "@api/lib/cache";
import { z } from "zod";
import { db } from "@api/lib/db";
import { AuthError } from "@api/lib/auth/guards";
import { ActionError, formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { createNumberedInvoice, paidAmount } from "@api/lib/services/invoices";
import { getPaymentProvider } from "@api/lib/services/payments";
import { invoiceScope, requireFinance } from "./access";
import { notifyNewInvoice, settleInvoice } from "./settle";

const MANUAL_METHODS = ["CASH", "BANK_TRANSFER", "CHECK", "OTHER"] as const;

function revalidateFinance(invoiceId?: string) {
  revalidatePath("/dashboard/finance", "layout");
  if (invoiceId) revalidatePath(`/dashboard/finance/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
}

// ── Invoices ──
const invoiceSchema = z.object({
  id: zs.optId,
  payerId: zs.id,
  childId: zs.optId,
  link: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().regex(/^(event|trip|activity):.+$/).optional()),
  description: zs.reqStr(300),
  amount: zs.money.refine((v) => v > 0, "errors.required"),
  dueDate: zs.reqDate,
  notes: zs.optStr,
  status: z.enum(["DRAFT", "PENDING"]).default("PENDING"),
});

export async function saveInvoice(fd: FormData | Record<string, unknown>) {
  return runAction(invoiceSchema, formToObject(fd), async (data) => {
    const { user } = await requireFinance({ manage: true });
    const payer = await db.member.findUnique({ where: { id: data.payerId }, select: { type: true } });
    if (!payer || !["PARENT", "MEMBER"].includes(payer.type)) throw new ActionError("errors.validation");
    if (data.childId) {
      const link = await db.guardianship.findUnique({ where: { parentId_childId: { parentId: data.payerId, childId: data.childId } } });
      if (!link) throw new ActionError("errors.validation");
    }
    const [kind, refId] = data.link ? data.link.split(":") : [];
    const fields = {
      payerId: data.payerId,
      childId: data.childId ?? null,
      eventId: kind === "event" ? refId : null,
      tripId: kind === "trip" ? refId : null,
      activityId: kind === "activity" ? refId : null,
      description: data.description,
      amount: data.amount,
      dueDate: data.dueDate,
      notes: data.notes ?? null,
      status: data.status,
    };

    if (data.id) {
      const existing = await db.invoice.findUnique({ where: { id: data.id }, include: { payments: true } });
      if (!existing) throw new AuthError("NOT_FOUND");
      if (paidAmount(existing) > 0 || existing.status === "CANCELLED") throw new ActionError("errors.inUse");
      await db.invoice.update({ where: { id: data.id }, data: fields });
      await settleInvoice(data.id);
      if (existing.status === "DRAFT" && data.status === "PENDING") await notifyNewInvoice(data.id);
      await audit(user.id, "update", "Invoice", data.id, { number: existing.number, amount: data.amount, status: data.status });
      revalidateFinance(data.id);
      return { id: data.id };
    }

    const created = await db.$transaction(async (tx) => createNumberedInvoice(tx, fields));
    await settleInvoice(created.id);
    if (data.status === "PENDING") await notifyNewInvoice(created.id);
    await audit(user.id, "create", "Invoice", created.id, { number: created.number, amount: created.amount, payerId: created.payerId });
    revalidateFinance(created.id);
    return { id: created.id };
  });
}

export async function cancelInvoice(id: string) {
  return runAction(zs.id, id, async (invoiceId) => {
    const { user } = await requireFinance({ manage: true });
    const inv = await db.invoice.findUnique({ where: { id: invoiceId }, include: { payments: true } });
    if (!inv) throw new AuthError("NOT_FOUND");
    if (paidAmount(inv) > 0) throw new ActionError("errors.inUse");
    await db.invoice.update({ where: { id: invoiceId }, data: { status: "CANCELLED", paidAt: null } });
    await audit(user.id, "cancel", "Invoice", invoiceId, { number: inv.number });
    revalidateFinance(invoiceId);
  });
}

/** DRAFT ↔ PENDING (also re-opens a cancelled invoice). */
export async function setInvoiceStatus(id: string, status: "DRAFT" | "PENDING") {
  return runAction(z.object({ id: zs.id, status: z.enum(["DRAFT", "PENDING"]) }), { id, status }, async (d) => {
    const { user } = await requireFinance({ manage: true });
    const inv = await db.invoice.findUnique({ where: { id: d.id }, include: { payments: true } });
    if (!inv) throw new AuthError("NOT_FOUND");
    if (d.status === "DRAFT" && paidAmount(inv) > 0) throw new ActionError("errors.inUse");
    await db.invoice.update({ where: { id: d.id }, data: { status: d.status } });
    await settleInvoice(d.id);
    if (d.status === "PENDING" && inv.status !== "PENDING") await notifyNewInvoice(d.id);
    await audit(user.id, "status", "Invoice", d.id, { number: inv.number, from: inv.status, to: d.status });
    revalidateFinance(d.id);
  });
}

// ── Payments ──
const paymentSchema = z.object({
  invoiceId: zs.id,
  amount: zs.money.refine((v) => v > 0, "errors.required"),
  method: z.enum(MANUAL_METHODS),
  reference: zs.optStr,
  paidAt: zs.optDate,
  notes: zs.optStr,
});

export async function recordPayment(fd: FormData | Record<string, unknown>) {
  return runAction(paymentSchema, formToObject(fd), async (data) => {
    const { user } = await requireFinance({ manage: true });
    const inv = await db.invoice.findUnique({ where: { id: data.invoiceId }, include: { payments: true } });
    if (!inv) throw new AuthError("NOT_FOUND");
    if (inv.status === "CANCELLED" || inv.status === "DRAFT") throw new ActionError("errors.validation");
    const remaining = inv.amount - paidAmount(inv);
    if (data.amount > remaining) throw new ActionError("errors.amountTooHigh");
    const paidAt = data.paidAt && data.paidAt <= new Date() ? data.paidAt : new Date();
    const p = await db.payment.create({
      data: { invoiceId: inv.id, amount: data.amount, method: data.method, reference: data.reference, paidAt, notes: data.notes, provider: "manual", recordedById: user.id, status: "COMPLETED" },
    });
    const status = await settleInvoice(inv.id, { amount: data.amount, notify: true });
    await audit(user.id, "payment", "Invoice", inv.id, { paymentId: p.id, number: inv.number, amount: data.amount, method: data.method, status });
    revalidateFinance(inv.id);
    return { status };
  });
}

/** Online checkout for the payer (or a guardian of the child). Pays the remaining balance. */
export async function payInvoiceOnline(id: string) {
  return runAction(zs.id, id, async (invoiceId) => {
    const { user } = await requireFinance();
    if (!user.permissions.has("invoices.pay") && !user.permissions.has("finance.manage")) throw new AuthError("FORBIDDEN");
    // Families may only pay invoices in their own scope.
    const inv = await db.invoice.findFirst({ where: { AND: [{ id: invoiceId }, await invoiceScope(user)] }, include: { payments: true, payer: { select: { email: true } } } });
    if (!inv) throw new AuthError("NOT_FOUND");
    if (!["PENDING", "PARTIALLY_PAID", "OVERDUE"].includes(inv.status)) throw new ActionError("errors.validation");
    const remaining = inv.amount - paidAmount(inv);
    if (remaining <= 0) throw new ActionError("errors.validation");
    const provider = getPaymentProvider();
    const res = await provider.createCheckout({ invoiceId: inv.id, amount: remaining, currency: inv.currency, description: `${inv.number} — ${inv.description}`, payerEmail: inv.payer.email ?? undefined });
    const p = await db.payment.create({
      data: { invoiceId: inv.id, amount: remaining, method: "ONLINE", provider: provider.key, providerRef: res.providerRef, reference: res.providerRef, status: res.status, recordedById: user.id, paidAt: new Date() },
    });
    const status = res.status === "COMPLETED" ? await settleInvoice(inv.id, { amount: remaining, notify: true }) : inv.status;
    await audit(user.id, "payment", "Invoice", inv.id, { paymentId: p.id, number: inv.number, amount: remaining, method: "ONLINE", provider: provider.key, providerRef: res.providerRef, result: res.status });
    revalidateFinance(inv.id);
    if (res.status === "FAILED") throw new ActionError("errors.unexpected");
    return { status, redirectUrl: res.redirectUrl };
  });
}

/** Refund / void a payment (kept for the audit trail with status REFUNDED). */
export async function refundPayment(id: string) {
  return runAction(zs.id, id, async (paymentId) => {
    const { user } = await requireFinance({ manage: true });
    const p = await db.payment.findUnique({ where: { id: paymentId }, include: { invoice: { select: { number: true } } } });
    if (!p) throw new AuthError("NOT_FOUND");
    if (p.status !== "COMPLETED") throw new ActionError("errors.validation");
    await db.payment.update({ where: { id: paymentId }, data: { status: "REFUNDED" } });
    const status = await settleInvoice(p.invoiceId);
    await audit(user.id, "refund", "Payment", paymentId, { invoiceId: p.invoiceId, number: p.invoice.number, amount: p.amount, method: p.method, invoiceStatus: status });
    revalidateFinance(p.invoiceId);
  });
}

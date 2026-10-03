import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";

type Tx = Prisma.TransactionClient | PrismaClient;

/** Next sequential invoice number: ONET-<year>-<0001>. */
export async function nextInvoiceNumber(tx: Tx = db) {
  const year = new Date().getFullYear();
  const prefix = `ONET-${year}-`;
  const last = await tx.invoice.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: "desc" }, select: { number: true } });
  const n = last ? Number(last.number.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}

/** Recompute invoice status from its completed payments. Call after any payment change. */
export async function refreshInvoiceStatus(invoiceId: string, tx: Tx = db) {
  const inv = await tx.invoice.findUnique({ where: { id: invoiceId }, include: { payments: true } });
  if (!inv || inv.status === "CANCELLED" || inv.status === "DRAFT") return inv;
  const paid = inv.payments.filter((p) => p.status === "COMPLETED").reduce((s, p) => s + p.amount, 0);
  let status = "PENDING";
  let paidAt: Date | null = null;
  if (paid >= inv.amount) {
    status = "PAID";
    paidAt = inv.payments.reduce<Date | null>((d, p) => (!d || p.paidAt > d ? p.paidAt : d), null);
  } else if (paid > 0) status = "PARTIALLY_PAID";
  else if (inv.dueDate < new Date()) status = "OVERDUE";
  return tx.invoice.update({ where: { id: invoiceId }, data: { status, paidAt } });
}

export function paidAmount(inv: { payments: { amount: number; status: string }[] }) {
  return inv.payments.filter((p) => p.status === "COMPLETED").reduce((s, p) => s + p.amount, 0);
}

/** Mark pending invoices whose due date has passed as OVERDUE (cheap, idempotent). */
export async function sweepOverdue() {
  await db.invoice.updateMany({ where: { status: "PENDING", dueDate: { lt: new Date() } }, data: { status: "OVERDUE" } });
}

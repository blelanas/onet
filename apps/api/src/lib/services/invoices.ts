import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "@api/lib/db";

type Tx = Prisma.TransactionClient | PrismaClient;

/** Next sequential invoice number: ONET-<year>-<0001>. */
export async function nextInvoiceNumber(tx: Tx = db) {
  const year = new Date().getFullYear();
  const prefix = `ONET-${year}-`;
  const last = await tx.invoice.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: "desc" }, select: { number: true } });
  const n = last ? Number(last.number.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}

const isNumberClash = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && JSON.stringify(e.meta?.target ?? "").includes("number");

/**
 * Creates an invoice with the next number, retrying when a concurrent writer (another API
 * instance) took the same number first (unique constraint on Invoice.number).
 */
export async function createNumberedInvoice(tx: Tx, data: Omit<Prisma.InvoiceUncheckedCreateInput, "number">, attempts = 5) {
  for (let i = 1; ; i++) {
    try {
      return await tx.invoice.create({ data: { ...data, number: await nextInvoiceNumber(tx) } });
    } catch (e) {
      if (i >= attempts || !isNumberClash(e)) throw e;
    }
  }
}

/** Recompute invoice status from its completed payments. Call after any payment change. */
export async function refreshInvoiceStatus(invoiceId: string, tx: Tx = db) {
  const inv = await tx.invoice.findUnique({ where: { id: invoiceId }, include: { payments: true } });
  if (!inv || inv.status === "CANCELLED" || inv.status === "DRAFT") return inv;
  const completed = inv.payments.filter((p) => p.status === "COMPLETED");
  const paid = completed.reduce((s, p) => s + p.amount, 0);
  let status = "PENDING";
  let paidAt: Date | null = null;
  if (paid >= inv.amount) {
    status = "PAID";
    paidAt = completed.reduce<Date | null>((d, p) => (!d || p.paidAt > d ? p.paidAt : d), null);
  } else if (paid > 0) status = "PARTIALLY_PAID";
  else if (inv.dueDate < new Date()) status = "OVERDUE";
  return tx.invoice.update({ where: { id: invoiceId }, data: { status, paidAt } });
}

export { paidAmount } from "@onet/shared";

/** Mark pending invoices whose due date has passed as OVERDUE (cheap, idempotent). */
export async function sweepOverdue() {
  await db.invoice.updateMany({ where: { status: "PENDING", dueDate: { lt: new Date() } }, data: { status: "OVERDUE" } });
}

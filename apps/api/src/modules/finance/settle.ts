import { db } from "@api/lib/db";
import { formatMoney } from "@api/lib/money";
import { refreshInvoiceStatus } from "@api/lib/services/invoices";
import { notifyRoles, notifyUsers } from "@api/lib/services/notifications";
import { getTranslations } from "@api/lib/i18n";
import { isLocale } from "@onet/shared";

async function tFor(userId: string | null | undefined) {
  const u = userId ? await db.user.findUnique({ where: { id: userId }, select: { locale: true } }) : null;
  const locale = u && isLocale(u.locale) ? u.locale : "fr";
  // Translate for the recipient (not the request locale).
  return { t: await getTranslations({ locale, namespace: "finance.notify" }), locale };
}

/**
 * Runs after any payment change: recomputes the invoice status, and when the invoice becomes
 * PAID confirms the linked event/trip registration (PENDING → CONFIRMED) and notifies the payer
 * and the accountants. Returns the new status.
 */
export async function settleInvoice(invoiceId: string, opts: { amount?: number; notify?: boolean } = {}) {
  const before = await db.invoice.findUnique({ where: { id: invoiceId }, select: { status: true } });
  const inv = await refreshInvoiceStatus(invoiceId);
  if (!inv) return null;
  const becamePaid = inv.status === "PAID" && before?.status !== "PAID";
  if (becamePaid) {
    await Promise.all([
      db.eventRegistration.updateMany({ where: { invoiceId, status: "PENDING" }, data: { status: "CONFIRMED" } }),
      db.tripRegistration.updateMany({ where: { invoiceId, status: "PENDING" }, data: { status: "CONFIRMED" } }),
    ]);
  }
  if (opts.notify && opts.amount) {
    const full = await db.invoice.findUnique({ where: { id: invoiceId }, select: { number: true, payer: { select: { userId: true, firstName: true, lastName: true } } } });
    if (full) {
      const link = `/dashboard/finance/invoices/${invoiceId}`;
      const payer = await tFor(full.payer.userId);
      const vars = { number: full.number, amount: formatMoney(opts.amount, payer.locale) };
      if (full.payer.userId) {
        await notifyUsers([full.payer.userId], {
          type: "PAYMENT_CONFIRMED",
          title: payer.t(becamePaid ? "paidTitle" : "receivedTitle", vars),
          body: payer.t(becamePaid ? "paidBody" : "receivedBody", vars),
          link,
        });
      }
      const staff = await tFor(null);
      await notifyRoles(["accountant"], {
        type: "PAYMENT_CONFIRMED",
        title: staff.t("staffTitle", { amount: formatMoney(opts.amount, "fr") }),
        body: staff.t("staffBody", { number: full.number, payer: `${full.payer.firstName} ${full.payer.lastName}` }),
        link,
      });
    }
  }
  return inv.status;
}

/** Notifies the payer that a new invoice is due. */
export async function notifyNewInvoice(invoiceId: string) {
  const inv = await db.invoice.findUnique({ where: { id: invoiceId }, select: { number: true, amount: true, dueDate: true, description: true, payer: { select: { userId: true } } } });
  if (!inv?.payer.userId) return;
  const { t, locale } = await tFor(inv.payer.userId);
  await notifyUsers([inv.payer.userId], {
    type: "PAYMENT_REMINDER",
    title: t("newTitle", { number: inv.number }),
    body: t("newBody", { description: inv.description, amount: formatMoney(inv.amount, locale) }),
    link: `/dashboard/finance/invoices/${invoiceId}`,
  });
}

// Finance mutations — same signatures as the former server actions, now calling the API.
import { apiSend, formAction } from "@/lib/api";

// Invoices
export const saveInvoice = formAction<{ id: string }>("POST", "/finance/invoices");
export const cancelInvoice = (id: string) => apiSend("POST", `/finance/invoices/${id}/cancel`);
export const setInvoiceStatus = (id: string, status: "DRAFT" | "PENDING") => apiSend("POST", `/finance/invoices/${id}/status`, { status });

// Payments
export const recordPayment = formAction<{ status: string | null }>("POST", (v) => `/finance/invoices/${v.invoiceId}/payments`);
export const payInvoiceOnline = (id: string) => apiSend<{ status: string | null; redirectUrl?: string }>("POST", `/finance/invoices/${id}/pay-online`);
export const refundPayment = (id: string) => apiSend("POST", `/finance/payments/${id}/refund`);

// Expenses
export const saveExpense = formAction<{ id: string }>("POST", "/finance/expenses");
export const deleteExpense = (id: string) => apiSend("DELETE", `/finance/expenses/${id}`);

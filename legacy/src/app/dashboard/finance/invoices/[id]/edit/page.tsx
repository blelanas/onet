import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FilePen } from "lucide-react";
import { pageQuery } from "@/lib/auth/guards";
import { canManageFinance, requireFinancePage } from "@/server/finance/access";
import { getInvoice, invoiceFormOptions } from "@/server/finance/queries";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceForm } from "@/components/finance/invoice-form";

export async function generateMetadata() {
  const t = await getTranslations("finance.titles");
  return { title: t("editInvoice") };
}

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireFinancePage({ staffOnly: true });
  if (!canManageFinance(user)) redirect("/dashboard/forbidden");
  const { id } = await params;
  const inv = await pageQuery(getInvoice(user, id));
  // Invoices with payments (or cancelled) are frozen: back to the detail page.
  if (inv.paid > 0 || inv.status === "CANCELLED") redirect(`/dashboard/finance/invoices/${id}`);
  const [options, t, tn] = await Promise.all([invoiceFormOptions(), getTranslations("finance"), getTranslations("nav")]);
  const link = inv.eventId ? `event:${inv.eventId}` : inv.tripId ? `trip:${inv.tripId}` : inv.activityId ? `activity:${inv.activityId}` : undefined;
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        icon={<FilePen className="size-6" />}
        title={t("titles.editInvoice")}
        description={inv.number}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.invoices"), href: "/dashboard/finance/invoices" }, { label: inv.number, href: `/dashboard/finance/invoices/${id}` }, { label: t("titles.editInvoice") }]}
      />
      <InvoiceForm
        initial={{ id: inv.id, payerId: inv.payerId, childId: inv.childId, link, description: inv.description, amount: inv.amount, dueDate: inv.dueDate, notes: inv.notes, status: inv.status }}
        options={options}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FilePlus2 } from "lucide-react";
import { canManageFinance, requireFinancePage } from "@/server/finance/access";
import { invoiceFormOptions } from "@/server/finance/queries";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceForm } from "@/components/finance/invoice-form";

export async function generateMetadata() {
  const t = await getTranslations("finance.titles");
  return { title: t("newInvoice") };
}

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ payer?: string; child?: string; link?: string }> }) {
  const { user } = await requireFinancePage({ staffOnly: true });
  if (!canManageFinance(user)) redirect("/dashboard/forbidden");
  const sp = await searchParams;
  const [options, t, tn] = await Promise.all([invoiceFormOptions(), getTranslations("finance"), getTranslations("nav")]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        icon={<FilePlus2 className="size-6" />}
        title={t("titles.newInvoice")}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.invoices"), href: "/dashboard/finance/invoices" }, { label: t("titles.newInvoice") }]}
      />
      <InvoiceForm initial={{ payerId: sp.payer, childId: sp.child, link: sp.link }} options={options} />
    </div>
  );
}

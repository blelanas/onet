import { getTranslations } from "next-intl/server";
import { Eye, Receipt } from "lucide-react";
import { sweepOverdue } from "@/lib/services/invoices";
import { canManageFinance, requireFinancePage } from "@/server/finance/access";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceList } from "@/components/finance/invoice-list";
import { FamilyInvoices } from "@/components/finance/family-invoices";

export async function generateMetadata() {
  const t = await getTranslations("finance.titles");
  return { title: t("invoices") };
}

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user, mode } = await requireFinancePage();
  await sweepOverdue();
  const t = await getTranslations("finance");
  const tn = await getTranslations("nav");
  const family = mode === "family";
  return (
    <>
      <PageHeader
        icon={<Receipt className="size-6" />}
        title={family ? t("titles.myInvoices") : t("titles.invoices")}
        description={family ? t("descriptions.myInvoices") : t("descriptions.invoices")}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: family ? t("titles.myInvoices") : t("titles.invoices") }]}
        actions={!family && !canManageFinance(user) ? <Badge tone="neutral"><Eye className="size-3.5" /> {t("readOnly")}</Badge> : undefined}
      />
      {family ? <FamilyInvoices user={user} /> : <InvoiceList user={user} searchParams={await searchParams} />}
    </>
  );
}

import { useTranslations } from "use-intl";
import { FilePlus2 } from "lucide-react";
import type { invoiceFormOptionsPage } from "@api/modules/finance/routes";
import { useApi } from "@/lib/query";
import { useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { QueryView } from "@/components/states/page-state";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceForm } from "@/components/finance/invoice-form";

type Data = Loaded<typeof invoiceFormOptionsPage>;

/** /dashboard/finance/invoices/new?payer=&child=&link= (finance managers). */
export function Component() {
  const t = useTranslations("finance");
  const tn = useTranslations("nav");
  usePageTitle(t("titles.newInvoice"));
  const sp = useSearchParamsObject();
  const query = useApi<Data>("/finance/invoices/options");
  return (
    <QueryView query={query}>
      {(options) => (
        <div className="mx-auto max-w-4xl">
          <PageHeader
            icon={<FilePlus2 className="size-6" />}
            title={t("titles.newInvoice")}
            breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.invoices"), href: "/dashboard/finance/invoices" }, { label: t("titles.newInvoice") }]}
          />
          <InvoiceForm initial={{ payerId: sp.payer, childId: sp.child, link: sp.link }} options={options} />
        </div>
      )}
    </QueryView>
  );
}

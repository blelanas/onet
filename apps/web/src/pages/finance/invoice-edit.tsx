import { useTranslations } from "use-intl";
import { FilePen } from "lucide-react";
import type { invoiceFormPage } from "@api/modules/finance/routes";
import { useApi } from "@/lib/query";
import { Navigate, useParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { QueryView } from "@/components/states/page-state";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceForm } from "@/components/finance/invoice-form";

type Data = Loaded<typeof invoiceFormPage>;

/** /dashboard/finance/invoices/:id/edit (finance managers, invoices without payments). */
export function Component() {
  const { id } = useParams();
  const t = useTranslations("finance");
  const tn = useTranslations("nav");
  usePageTitle(t("titles.editInvoice"));
  const query = useApi<Data>(`/finance/invoices/${id}/form`);
  return (
    <QueryView query={query}>
      {(data) =>
        // Invoices with payments (or cancelled) are frozen: back to the detail page.
        data.frozen ? (
          <Navigate to={`/dashboard/finance/invoices/${id}`} replace />
        ) : (
          <div className="mx-auto max-w-4xl">
            <PageHeader
              icon={<FilePen className="size-6" />}
              title={t("titles.editInvoice")}
              description={data.inv.number}
              breadcrumbs={[
                { label: tn("items.dashboard"), href: "/dashboard" },
                { label: t("titles.invoices"), href: "/dashboard/finance/invoices" },
                { label: data.inv.number, href: `/dashboard/finance/invoices/${id}` },
                { label: t("titles.editInvoice") },
              ]}
            />
            <InvoiceForm key={data.inv.id} initial={data.initial} options={data.options} />
          </div>
        )
      }
    </QueryView>
  );
}

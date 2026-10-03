import { useTranslations } from "use-intl";
import { Eye, Receipt } from "lucide-react";
import type { invoicesPage } from "@api/modules/finance/routes";
import { useApi } from "@/lib/query";
import { useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { QueryView } from "@/components/states/page-state";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceList } from "@/components/finance/invoice-list";
import { FamilyInvoices } from "@/components/finance/family-invoices";

type Data = Loaded<typeof invoicesPage>;

/** /dashboard/finance/invoices — staff list or the family view (mode decided by the API). */
export function Component() {
  const sp = useSearchParamsObject();
  const query = useApi<Data>("/finance/invoices", sp);
  return <QueryView query={query}>{(data) => <InvoicesPage data={data} sp={sp} />}</QueryView>;
}

function InvoicesPage({ data, sp }: { data: Data; sp: Record<string, string | undefined> }) {
  const t = useTranslations("finance");
  const tn = useTranslations("nav");
  const family = data.mode === "family";
  const title = family ? t("titles.myInvoices") : t("titles.invoices");
  usePageTitle(t("titles.invoices"));
  return (
    <>
      <PageHeader
        icon={<Receipt className="size-6" />}
        title={title}
        description={family ? t("descriptions.myInvoices") : t("descriptions.invoices")}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: title }]}
        actions={
          !family && !data.manage ? (
            <Badge tone="neutral">
              <Eye className="size-3.5" /> {t("readOnly")}
            </Badge>
          ) : undefined
        }
      />
      {data.family ? <FamilyInvoices invoices={data.family} /> : data.list && <InvoiceList data={data.list} canManage={data.manage} searchParams={sp} />}
    </>
  );
}

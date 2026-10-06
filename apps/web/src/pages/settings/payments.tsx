import { useTranslations } from "use-intl";
import type { paymentSettingsPage } from "@api/modules/settings/routes";
import { useApi } from "@/lib/query";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { QueryView } from "@/components/states/page-state";
import { RequirePerm } from "@/components/states/guards";
import { PaymentsForm } from "@/components/settings/payments-form";

/** /dashboard/settings/payments */
export function Component() {
  const t = useTranslations("settings.nav");
  usePageTitle(t("payments"));
  return (
    <RequirePerm perm="settings.manage">
      <Page />
    </RequirePerm>
  );
}

function Page() {
  const query = useApi<Loaded<typeof paymentSettingsPage>>("/settings/payments");
  return <QueryView query={query}>{(d) => <PaymentsForm methods={d.methods} bank={d.bank} feeTnd={d.feeTnd} />}</QueryView>;
}

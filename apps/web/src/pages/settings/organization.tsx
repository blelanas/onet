import { useTranslations } from "use-intl";
import type { organizationSettingsPage } from "@api/modules/settings/routes";
import { useApi } from "@/lib/query";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { QueryView } from "@/components/states/page-state";
import { RequirePerm } from "@/components/states/guards";
import { OrganizationForm } from "@/components/settings/organization-form";

/** /dashboard/settings/organization */
export function Component() {
  const t = useTranslations("settings.nav");
  usePageTitle(t("organization"));
  return (
    <RequirePerm perm="settings.manage">
      <Page />
    </RequirePerm>
  );
}

function Page() {
  const query = useApi<Loaded<typeof organizationSettingsPage>>("/settings/organization");
  return <QueryView query={query}>{(d) => <OrganizationForm profile={d.profile} logoUrl={d.logoUrl} />}</QueryView>;
}

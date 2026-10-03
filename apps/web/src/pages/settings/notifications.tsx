import { useTranslations } from "use-intl";
import type { notificationSettingsPage } from "@api/modules/settings/routes";
import { useApi } from "@/lib/query";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { QueryView } from "@/components/states/page-state";
import { RequirePerm } from "@/components/states/guards";
import { ChannelsForm } from "@/components/settings/channels-form";
import { SettingsCard } from "@/components/settings/settings-card";

/** /dashboard/settings/notifications — notification channels. */
export function Component() {
  const tn = useTranslations("settings.nav");
  usePageTitle(tn("notifications"));
  return (
    <RequirePerm perm="settings.manage">
      <Page />
    </RequirePerm>
  );
}

function Page() {
  const t = useTranslations("settings.notifications");
  const query = useApi<Loaded<typeof notificationSettingsPage>>("/settings/notifications");
  return (
    <SettingsCard title={t("title")} description={t("intro")}>
      <QueryView query={query}>{(d) => <ChannelsForm enabled={d.channels} />}</QueryView>
    </SettingsCard>
  );
}

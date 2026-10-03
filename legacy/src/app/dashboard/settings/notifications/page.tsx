import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth/guards";
import { getSetting } from "@/server/settings/store";
import { ChannelsForm } from "@/components/settings/channels-form";
import { SettingsCard } from "@/components/settings/settings-card";

export async function generateMetadata() {
  const t = await getTranslations("settings.nav");
  return { title: t("notifications") };
}

export default async function NotificationSettingsPage() {
  await requirePagePermission("settings.manage");
  const t = await getTranslations("settings.notifications");
  const channels = await getSetting<string[]>("notifications.channels", ["IN_APP"]);
  return (
    <SettingsCard title={t("title")} description={t("intro")}>
      <ChannelsForm enabled={Array.isArray(channels) ? channels : ["IN_APP"]} />
    </SettingsCard>
  );
}

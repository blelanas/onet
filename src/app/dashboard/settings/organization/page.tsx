import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth/guards";
import { getSetting, type OrganizationProfile } from "@/server/settings/store";
import { OrganizationForm } from "@/components/settings/organization-form";

export async function generateMetadata() {
  const t = await getTranslations("settings.nav");
  return { title: t("organization") };
}

export default async function OrganizationSettingsPage() {
  await requirePagePermission("settings.manage");
  const [profile, logoUrl] = await Promise.all([getSetting<OrganizationProfile>("organization.profile", {}), getSetting<string | null>("organization.logoUrl", null)]);
  return <OrganizationForm profile={profile} logoUrl={logoUrl} />;
}

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Settings } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { allowedSections } from "@/components/settings/sections";
import { SettingsNav } from "@/components/settings/settings-nav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const sections = allowedSections(user.permissions);
  if (!sections.length) redirect("/dashboard/forbidden");
  const t = await getTranslations("settings");
  const tn = await getTranslations("nav");
  const unreadContact = user.permissions.has("settings.manage") ? await db.contactMessage.count({ where: { isRead: false } }) : 0;
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} icon={<Settings className="size-6" />} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title") }]} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        <SettingsNav keys={sections.map((s) => s.key)} badges={{ contact: unreadContact }} />
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}

import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { ConferenceForm } from "@/components/content/conferences/conference-form";

export async function generateMetadata() {
  const t = await getTranslations("content.conferences");
  return { title: t("new") };
}

export default async function NewConferencePage() {
  await requirePagePermission("content.manage");
  const t = await getTranslations("content.conferences");
  const tn = await getTranslations("nav");
  const d = new Date();
  d.setDate(d.getDate() + 14);
  d.setHours(18, 0, 0, 0);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("new")} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title"), href: "/dashboard/content/conferences" }, { label: t("new") }]} />
      <ConferenceForm initial={{ isPublic: true, date: d }} />
    </div>
  );
}

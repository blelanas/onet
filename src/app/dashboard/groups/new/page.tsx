import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { GroupForm } from "@/components/groups/group-form";

export async function generateMetadata() {
  const t = await getTranslations("groups");
  return { title: t("new") };
}

export default async function NewGroupPage() {
  await requirePagePermission("groups.manage");
  const t = await getTranslations("groups");
  const tn = await getTranslations("nav");
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("new")} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title"), href: "/dashboard/groups" }, { label: t("new") }]} />
      <GroupForm initial={{ isActive: true, capacity: 20 }} />
    </div>
  );
}

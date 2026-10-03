import { getTranslations } from "next-intl/server";
import { pageQuery, requirePagePermission } from "@/lib/auth/guards";
import { getGroup } from "@/server/groups/queries";
import { PageHeader } from "@/components/ui/page-header";
import { GroupForm } from "@/components/groups/group-form";

export default async function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("groups.manage");
  const { id } = await params;
  const g = await pageQuery(getGroup(user, id));
  const t = await getTranslations("groups");
  const tn = await getTranslations("nav");
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("edit")}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title"), href: "/dashboard/groups" }, { label: g.name, href: `/dashboard/groups/${id}` }, { label: t("edit") }]}
      />
      <GroupForm initial={g} />
    </div>
  );
}

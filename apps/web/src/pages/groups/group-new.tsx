import { useTranslations } from "use-intl";
import { usePageTitle } from "@/lib/title";
import { RequirePerm } from "@/components/states/guards";
import { PageHeader } from "@/components/ui/page-header";
import { GroupForm } from "@/components/groups/group-form";

export function Component() {
  const t = useTranslations("groups");
  const tn = useTranslations("nav");
  usePageTitle(t("new"));
  return (
    <RequirePerm perm="groups.manage">
      <div className="mx-auto max-w-6xl">
        <PageHeader title={t("new")} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title"), href: "/dashboard/groups" }, { label: t("new") }]} />
        <GroupForm initial={{ isActive: true, capacity: 20 }} />
      </div>
    </RequirePerm>
  );
}

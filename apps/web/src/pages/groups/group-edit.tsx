import { useTranslations } from "use-intl";
import type { groupFormPage } from "@api/modules/groups/routes";
import { useApi } from "@/lib/query";
import { useParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { RequirePerm } from "@/components/states/guards";
import { QueryView } from "@/components/states/page-state";
import { PageHeader } from "@/components/ui/page-header";
import { GroupForm } from "@/components/groups/group-form";

export function Component() {
  const t = useTranslations("groups");
  usePageTitle(t("edit"));
  return (
    <RequirePerm perm="groups.manage">
      <EditGroup />
    </RequirePerm>
  );
}

function EditGroup() {
  const { id } = useParams();
  const t = useTranslations("groups");
  const tn = useTranslations("nav");
  const query = useApi<Loaded<typeof groupFormPage>>(`/groups/${id}/form`);
  return (
    <div className="mx-auto max-w-6xl">
      <QueryView query={query}>
        {(g) => (
          <>
            <PageHeader
              title={t("edit")}
              breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title"), href: "/dashboard/groups" }, { label: g.name, href: `/dashboard/groups/${id}` }, { label: t("edit") }]}
            />
            <GroupForm key={g.id} initial={g} />
          </>
        )}
      </QueryView>
    </div>
  );
}

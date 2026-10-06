import { useTranslations } from "use-intl";
import type { memberFormPage, memberOptionsPage } from "@api/modules/members/routes";
import { useApi } from "@/lib/query";
import { useParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { RequirePerm } from "@/components/states/guards";
import { QueryView } from "@/components/states/page-state";
import { PageHeader } from "@/components/ui/page-header";
import { MemberForm } from "@/components/members/member-form";

export function Component() {
  const { id } = useParams();
  const t = useTranslations("people");
  const tn = useTranslations("nav");
  usePageTitle(t("titles.editMember"));
  const member = useApi<Loaded<typeof memberFormPage>>(`/members/${id}/form`);
  const options = useApi<Loaded<typeof memberOptionsPage>>("/members/options", { types: "PARENT,MEMBER,STAFF,MONITOR" });
  return (
    <RequirePerm perm="members.manage">
      <div className="mx-auto max-w-4xl">
        <QueryView query={member}>
          {(m) => (
            <>
              <PageHeader
                title={t("titles.editMember")}
                description={`${m.firstName} ${m.lastName}`}
                breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.members"), href: "/dashboard/members" }, { label: `${m.firstName} ${m.lastName}`, href: `/dashboard/members/${id}` }, { label: t("titles.editMember") }]}
              />
              <QueryView query={options}>{(o) => <MemberForm initial={m} parents={o.members.filter((p) => p.id !== id)} groups={o.groups} />}</QueryView>
            </>
          )}
        </QueryView>
      </div>
    </RequirePerm>
  );
}

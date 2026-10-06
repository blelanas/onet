import { useTranslations } from "use-intl";
import { MEMBER_TYPES } from "@onet/shared";
import type { memberOptionsPage } from "@api/modules/members/routes";
import { useApi } from "@/lib/query";
import { useSearchParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { RequirePerm } from "@/components/states/guards";
import { QueryView } from "@/components/states/page-state";
import { PageHeader } from "@/components/ui/page-header";
import { MemberForm } from "@/components/members/member-form";

export function Component() {
  const sp = useSearchParams();
  const t = useTranslations("people");
  const tn = useTranslations("nav");
  const type = (MEMBER_TYPES as readonly string[]).includes(sp.get("type") ?? "") ? sp.get("type")! : "CHILD";
  const parent = sp.get("parent");
  usePageTitle(t(`new.${type}`));
  const options = useApi<Loaded<typeof memberOptionsPage>>("/members/options", { types: "PARENT,MEMBER,STAFF,MONITOR" });
  return (
    <RequirePerm perm="members.manage">
      <div className="mx-auto max-w-4xl">
        <PageHeader title={t(`new.${type}`)} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.members"), href: "/dashboard/members" }, { label: t("titles.newMember") }]} />
        <QueryView query={options}>{(o) => <MemberForm initial={{ type, parentIds: parent ? [parent] : [] }} parents={o.members} groups={o.groups} />}</QueryView>
      </div>
    </RequirePerm>
  );
}

import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth/guards";
import { MEMBER_TYPES } from "@/lib/constants";
import { groupOptions, memberOptions } from "@/server/members/queries";
import { PageHeader } from "@/components/ui/page-header";
import { MemberForm } from "@/components/members/member-form";

export default async function NewMemberPage({ searchParams }: { searchParams: Promise<{ type?: string; parent?: string }> }) {
  await requirePagePermission("members.manage");
  const sp = await searchParams;
  const t = await getTranslations("people");
  const tn = await getTranslations("nav");
  const type = (MEMBER_TYPES as readonly string[]).includes(sp.type ?? "") ? sp.type! : "CHILD";
  const [parents, groups] = await Promise.all([memberOptions(["PARENT", "MEMBER", "STAFF", "MONITOR"]), groupOptions()]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t(`new.${type}`)} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.members"), href: "/dashboard/members" }, { label: t("titles.newMember") }]} />
      <MemberForm initial={{ type, parentIds: sp.parent ? [sp.parent] : [] }} parents={parents} groups={groups} />
    </div>
  );
}

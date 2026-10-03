import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { groupOptions, memberOptions } from "@/server/members/queries";
import { PageHeader } from "@/components/ui/page-header";
import { MemberForm } from "@/components/members/member-form";

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("members.manage");
  const { id } = await params;
  const member = await db.member.findUnique({ where: { id }, include: { parentLinks: true, monitoredGroups: true } });
  if (!member) notFound();
  const t = await getTranslations("people");
  const tn = await getTranslations("nav");
  const [parents, groups] = await Promise.all([memberOptions(["PARENT", "MEMBER", "STAFF", "MONITOR"]), groupOptions()]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={t("titles.editMember")}
        description={`${member.firstName} ${member.lastName}`}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.members"), href: "/dashboard/members" }, { label: `${member.firstName} ${member.lastName}`, href: `/dashboard/members/${id}` }, { label: t("titles.editMember") }]}
      />
      <MemberForm initial={{ ...member, parentIds: member.parentLinks.map((p) => p.parentId), monitorGroupIds: member.monitoredGroups.map((g) => g.groupId) }} parents={parents.filter((p) => p.id !== id)} groups={groups} />
    </div>
  );
}

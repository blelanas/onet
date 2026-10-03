import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { MemberDirectory } from "@/components/members/member-directory";

export async function generateMetadata() {
  const t = await getTranslations("people.titles");
  return { title: t("members") };
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePagePermission("members.read_all");
  const t = await getTranslations("people");
  const tn = await getTranslations("nav");
  return (
    <>
      <PageHeader title={t("titles.members")} description={t("descriptions.members")} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.members") }]} />
      <MemberDirectory user={user} basePath="/dashboard/members" searchParams={await searchParams} />
    </>
  );
}

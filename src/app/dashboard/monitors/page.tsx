import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { MemberDirectory } from "@/components/members/member-directory";

export async function generateMetadata() {
  const t = await getTranslations("people.titles");
  return { title: t("monitors") };
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePagePermission("members.read_all");
  const t = await getTranslations("people");
  const tn = await getTranslations("nav");
  return (
    <>
      <PageHeader title={t("titles.monitors")} description={t("descriptions.monitors")} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.monitors") }]} />
      <MemberDirectory user={user} fixedType="MONITOR" basePath="/dashboard/monitors" searchParams={await searchParams} />
    </>
  );
}

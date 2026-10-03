import { getTranslations } from "next-intl/server";
import { pageQuery, requirePagePermission } from "@/lib/auth/guards";
import { getConference } from "@/server/content/conferences";
import { PageHeader } from "@/components/ui/page-header";
import { ConferenceForm } from "@/components/content/conferences/conference-form";

export async function generateMetadata() {
  const t = await getTranslations("content.conferences");
  return { title: t("editTitle") };
}

export default async function EditConferencePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("content.manage");
  const { id } = await params;
  const c = await pageQuery(getConference(id));
  const t = await getTranslations("content.conferences");
  const tn = await getTranslations("nav");
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("editTitle")}
        description={c.title}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title"), href: "/dashboard/content/conferences" }, { label: c.title, href: `/dashboard/content/conferences/${id}` }, { label: t("editTitle") }]}
      />
      <ConferenceForm initial={c} />
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { pageQuery, requirePagePermission } from "@/lib/auth/guards";
import { getEventForEdit } from "@/server/events/queries";
import { PageHeader } from "@/components/ui/page-header";
import { EventForm } from "@/components/events/event-form";

export async function generateMetadata() {
  const t = await getTranslations("events");
  return { title: t("titles.edit") };
}

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("events.manage");
  const { id } = await params;
  const e = await pageQuery(getEventForEdit(id));
  const t = await getTranslations("events");
  const tn = await getTranslations("nav");
  return (
    <>
      <PageHeader
        title={t("titles.edit")}
        description={e.title}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.events"), href: "/dashboard/events" }, { label: e.title, href: `/dashboard/events/${id}` }, { label: t("titles.edit") }]}
      />
      <div className="max-w-4xl">
        <EventForm initial={e} />
      </div>
    </>
  );
}

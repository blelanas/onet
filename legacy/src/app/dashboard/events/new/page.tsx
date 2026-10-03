import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { EventForm } from "@/components/events/event-form";

export async function generateMetadata() {
  const t = await getTranslations("events");
  return { title: t("titles.new") };
}

export default async function NewEventPage() {
  await requirePagePermission("events.manage");
  const t = await getTranslations("events");
  const tn = await getTranslations("nav");
  const start = new Date();
  start.setDate(start.getDate() + 14);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start.getTime() + 3 * 3600_000);
  return (
    <>
      <PageHeader title={t("titles.new")} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.events"), href: "/dashboard/events" }, { label: t("titles.new") }]} />
      <div className="max-w-4xl">
        <EventForm initial={{ startAt: start, endAt: end }} />
      </div>
    </>
  );
}

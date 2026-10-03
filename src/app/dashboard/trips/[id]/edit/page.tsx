import { getTranslations } from "next-intl/server";
import { pageQuery, requirePagePermission } from "@/lib/auth/guards";
import { getTripForEdit, monitorOptions } from "@/server/trips/queries";
import { PageHeader } from "@/components/ui/page-header";
import { TripForm } from "@/components/trips/trip-form";

export async function generateMetadata() {
  const t = await getTranslations("trips");
  return { title: t("titles.edit") };
}

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("trips.manage");
  const { id } = await params;
  const trip = await pageQuery(getTripForEdit(id));
  const t = await getTranslations("trips");
  const tn = await getTranslations("nav");
  const monitors = await monitorOptions();
  return (
    <>
      <PageHeader
        title={t("titles.edit")}
        description={trip.title}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.trips"), href: "/dashboard/trips" }, { label: trip.title, href: `/dashboard/trips/${id}` }, { label: t("titles.edit") }]}
      />
      <div className="max-w-4xl">
        <TripForm initial={{ ...trip, monitorIds: trip.monitors.map((m) => m.memberId) }} monitors={monitors} />
      </div>
    </>
  );
}

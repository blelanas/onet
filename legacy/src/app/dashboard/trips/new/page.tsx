import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth/guards";
import { monitorOptions } from "@/server/trips/queries";
import { PageHeader } from "@/components/ui/page-header";
import { TripForm } from "@/components/trips/trip-form";

export async function generateMetadata() {
  const t = await getTranslations("trips");
  return { title: t("titles.new") };
}

export default async function NewTripPage() {
  await requirePagePermission("trips.manage");
  const t = await getTranslations("trips");
  const tn = await getTranslations("nav");
  const monitors = await monitorOptions();
  const depart = new Date();
  depart.setDate(depart.getDate() + 30);
  depart.setHours(7, 0, 0, 0);
  const ret = new Date(depart);
  ret.setHours(18, 0, 0, 0);
  return (
    <>
      <PageHeader title={t("titles.new")} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.trips"), href: "/dashboard/trips" }, { label: t("titles.new") }]} />
      <div className="max-w-4xl">
        <TripForm initial={{ departAt: depart, returnAt: ret }} monitors={monitors} />
      </div>
    </>
  );
}

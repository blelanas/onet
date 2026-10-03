import { useTranslations } from "use-intl";
import type { tripFormPage } from "@api/modules/trips/routes";
import { useApi } from "@/lib/query";
import { useParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { RequirePerm } from "@/components/states/guards";
import { QueryView } from "@/components/states/page-state";
import { PageHeader } from "@/components/ui/page-header";
import { TripForm } from "@/components/trips/trip-form";

export function Component() {
  const t = useTranslations("trips");
  usePageTitle(t("titles.edit"));
  return (
    <RequirePerm perm="trips.manage">
      <EditTrip />
    </RequirePerm>
  );
}

function EditTrip() {
  const { id } = useParams();
  const t = useTranslations("trips");
  const tn = useTranslations("nav");
  const query = useApi<Loaded<typeof tripFormPage>>(`/trips/${id}/form`);
  return (
    <QueryView query={query}>
      {({ trip, monitors }) => (
        <>
          <PageHeader
            title={t("titles.edit")}
            description={trip.title}
            breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.trips"), href: "/dashboard/trips" }, { label: trip.title, href: `/dashboard/trips/${id}` }, { label: t("titles.edit") }]}
          />
          <div className="max-w-4xl">
            <TripForm key={trip.id} initial={trip} monitors={monitors} />
          </div>
        </>
      )}
    </QueryView>
  );
}

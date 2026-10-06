import { useMemo } from "react";
import { useTranslations } from "use-intl";
import type { tripFormOptionsPage } from "@api/modules/trips/routes";
import { useApi } from "@/lib/query";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { RequirePerm } from "@/components/states/guards";
import { QueryView } from "@/components/states/page-state";
import { PageHeader } from "@/components/ui/page-header";
import { TripForm } from "@/components/trips/trip-form";

export function Component() {
  const t = useTranslations("trips");
  const tn = useTranslations("nav");
  usePageTitle(t("titles.new"));
  return (
    <RequirePerm perm="trips.manage">
      <PageHeader title={t("titles.new")} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.trips"), href: "/dashboard/trips" }, { label: t("titles.new") }]} />
      <div className="max-w-4xl">
        <NewTripForm />
      </div>
    </RequirePerm>
  );
}

function NewTripForm() {
  const query = useApi<Loaded<typeof tripFormOptionsPage>>("/trips/options");
  const initial = useMemo(() => {
    const depart = new Date();
    depart.setDate(depart.getDate() + 30);
    depart.setHours(7, 0, 0, 0);
    const ret = new Date(depart);
    ret.setHours(18, 0, 0, 0);
    return { departAt: depart, returnAt: ret };
  }, []);
  return <QueryView query={query}>{({ monitors }) => <TripForm initial={initial} monitors={monitors} />}</QueryView>;
}

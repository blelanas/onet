import { useTranslations } from "use-intl";
import type { eventFormPage } from "@api/modules/events/routes";
import { useApi } from "@/lib/query";
import { useParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { RequirePerm } from "@/components/states/guards";
import { QueryView } from "@/components/states/page-state";
import { PageHeader } from "@/components/ui/page-header";
import { EventForm } from "@/components/events/event-form";

export function Component() {
  const t = useTranslations("events");
  usePageTitle(t("titles.edit"));
  return (
    <RequirePerm perm="events.manage">
      <EditEvent />
    </RequirePerm>
  );
}

function EditEvent() {
  const { id } = useParams();
  const t = useTranslations("events");
  const tn = useTranslations("nav");
  const query = useApi<Loaded<typeof eventFormPage>>(`/events/${id}/form`);
  return (
    <QueryView query={query}>
      {(e) => (
        <>
          <PageHeader
            title={t("titles.edit")}
            description={e.title}
            breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.events"), href: "/dashboard/events" }, { label: e.title, href: `/dashboard/events/${id}` }, { label: t("titles.edit") }]}
          />
          <div className="max-w-4xl">
            <EventForm key={e.id} initial={e} />
          </div>
        </>
      )}
    </QueryView>
  );
}

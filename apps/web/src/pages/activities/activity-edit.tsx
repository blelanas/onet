import { useLocale, useTranslations } from "use-intl";
import type { activityEditPage } from "@api/modules/activities/routes";
import { formatDate } from "@onet/shared";
import { useApi } from "@/lib/query";
import { useParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { RequirePerm } from "@/components/states/guards";
import { QueryView } from "@/components/states/page-state";
import { PageHeader } from "@/components/ui/page-header";
import { ActivityForm } from "@/components/activities/activity-form";

export function Component() {
  const t = useTranslations("activities");
  usePageTitle(t("edit"));
  return (
    <RequirePerm perm="activities.manage">
      <EditActivity />
    </RequirePerm>
  );
}

function EditActivity() {
  const { id } = useParams();
  const t = useTranslations("activities");
  const tn = useTranslations("nav");
  const locale = useLocale();
  // The API answers 403 when this monitor may not manage the activity.
  const query = useApi<Loaded<typeof activityEditPage>>(`/activities/${id}/form`);
  return (
    <div className="mx-auto max-w-6xl">
      <QueryView query={query}>
        {({ activity: a, monitors, groups, events }) => (
          <>
            <PageHeader
              title={t("edit")}
              breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title"), href: "/dashboard/activities" }, { label: a.title, href: `/dashboard/activities/${id}` }, { label: t("edit") }]}
            />
            <ActivityForm
              key={a.id}
              initial={{ ...a, monitorId: a.monitor?.id ?? null }}
              monitors={monitors}
              groups={groups}
              events={events.map((e) => ({ id: e.id, name: `${e.title} · ${formatDate(e.startAt, locale)}` }))}
            />
          </>
        )}
      </QueryView>
    </div>
  );
}

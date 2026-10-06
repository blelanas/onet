import { useLocale, useTranslations } from "use-intl";
import type { activityNewPage } from "@api/modules/activities/routes";
import { formatDate } from "@onet/shared";
import { useApi } from "@/lib/query";
import { useSearchParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { RequirePerm } from "@/components/states/guards";
import { QueryView } from "@/components/states/page-state";
import { PageHeader } from "@/components/ui/page-header";
import { ActivityForm } from "@/components/activities/activity-form";

export function Component() {
  const t = useTranslations("activities");
  usePageTitle(t("new"));
  return (
    <RequirePerm perm="activities.manage">
      <NewActivity />
    </RequirePerm>
  );
}

function NewActivity() {
  const t = useTranslations("activities");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const group = useSearchParams().get("group");
  const query = useApi<Loaded<typeof activityNewPage>>("/activities/form-options");
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("new")} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title"), href: "/dashboard/activities" }, { label: t("new") }]} />
      <QueryView query={query}>
        {(opts) => (
          <ActivityForm
            initial={{
              status: "ACTIVE",
              capacity: 20,
              durationMin: 60,
              isPublic: true,
              groupId: opts.groups.some((g) => g.id === group) ? group : null,
              monitorId: opts.admin ? null : opts.memberId,
              startDate: new Date(),
            }}
            monitors={opts.monitors}
            groups={opts.groups}
            events={opts.events.map((e) => ({ id: e.id, name: `${e.title} · ${formatDate(e.startAt, locale)}` }))}
          />
        )}
      </QueryView>
    </div>
  );
}

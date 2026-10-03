import { useTranslations } from "use-intl";
import { Plus, Sparkles } from "lucide-react";
import type { groupActivitiesTab } from "@api/modules/groups/routes";
import { can, useMe } from "@/lib/auth";
import { useApi } from "@/lib/query";
import type { Loaded } from "@/lib/types";
import { QueryView } from "@/components/states/page-state";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { ActivityCard } from "@/components/activities/activity-card";
import { TabSkeleton } from "../grid-skeleton";

type Data = Loaded<typeof groupActivitiesTab>;

export function ActivitiesTab({ groupId }: { groupId: string }) {
  const query = useApi<Data>(`/groups/${groupId}/activities`);
  return <QueryView query={query} skeleton={<TabSkeleton />}>{(data) => <ActivitiesPanel groupId={groupId} activities={data.activities} />}</QueryView>;
}

function ActivitiesPanel({ groupId, activities }: { groupId: string; activities: Data["activities"] }) {
  const t = useTranslations("groups.activities");
  const user = useMe();
  const canCreate = can(user, "activities.manage");
  return (
    <Section
      title={t("title")}
      action={
        canCreate ? (
          <LinkButton href={`/dashboard/activities/new?group=${groupId}`} size="sm" variant="soft">
            <Plus className="size-4" /> {t("new")}
          </LinkButton>
        ) : undefined
      }
    >
      {activities.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {activities.map((a) => (
            <ActivityCard key={a.id} a={a} />
          ))}
        </div>
      ) : (
        <EmptyState compact title={t("empty")} icon={<Sparkles className="size-4" />} />
      )}
    </Section>
  );
}

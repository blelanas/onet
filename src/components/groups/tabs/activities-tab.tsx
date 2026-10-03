import { getTranslations } from "next-intl/server";
import { Plus, Sparkles } from "lucide-react";
import type { CurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { ActivityCard } from "@/components/activities/activity-card";

export async function ActivitiesTab({ user, groupId }: { user: CurrentUser; groupId: string }) {
  const t = await getTranslations("groups.activities");
  const canCreate = can(user, "activities.manage");
  const activities = await db.activity.findMany({
    where: { groupId, ...(canCreate ? {} : { status: { not: "DRAFT" } }) },
    orderBy: [{ status: "asc" }, { dayOfWeek: "asc" }, { startTime: "asc" }],
    include: { group: { select: { id: true, name: true, color: true } }, _count: { select: { participants: true } } },
  });
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

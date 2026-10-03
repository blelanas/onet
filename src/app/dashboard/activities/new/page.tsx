import { getLocale, getTranslations } from "next-intl/server";
import { can, requirePagePermission } from "@/lib/auth/guards";
import { myGroupIds } from "@/lib/auth/scope";
import { formatDate } from "@/lib/dates";
import { activityFormOptions } from "@/server/activities/queries";
import { PageHeader } from "@/components/ui/page-header";
import { ActivityForm } from "@/components/activities/activity-form";

export async function generateMetadata() {
  const t = await getTranslations("activities");
  return { title: t("new") };
}

export default async function NewActivityPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const user = await requirePagePermission("activities.manage");
  const sp = await searchParams;
  const t = await getTranslations("activities");
  const tn = await getTranslations("nav");
  const locale = await getLocale();
  const opts = await activityFormOptions();
  const admin = can(user, "members.read_all") || can(user, "groups.manage");
  const mine = admin ? null : await myGroupIds(user);
  const groups = opts.groups.filter((g) => !mine || mine.includes(g.id));
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("new")} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title"), href: "/dashboard/activities" }, { label: t("new") }]} />
      <ActivityForm
        initial={{ status: "ACTIVE", capacity: 20, durationMin: 60, isPublic: true, groupId: groups.some((g) => g.id === sp.group) ? sp.group : null, monitorId: admin ? null : user.memberId, startDate: new Date() }}
        monitors={opts.monitors.map((m) => ({ id: m.id, name: `${m.firstName} ${m.lastName}` }))}
        groups={groups}
        events={opts.events.map((e) => ({ id: e.id, name: `${e.title} · ${formatDate(e.startAt, locale)}` }))}
      />
    </div>
  );
}

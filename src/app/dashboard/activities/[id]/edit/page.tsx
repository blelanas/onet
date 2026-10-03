import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { can, pageQuery, requirePagePermission } from "@/lib/auth/guards";
import { myGroupIds } from "@/lib/auth/scope";
import { formatDate } from "@/lib/dates";
import { activityFormOptions, canManageActivity, getActivity } from "@/server/activities/queries";
import { PageHeader } from "@/components/ui/page-header";
import { ActivityForm } from "@/components/activities/activity-form";

export default async function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("activities.manage");
  const { id } = await params;
  const a = await pageQuery(getActivity(user, id));
  if (!(await canManageActivity(user, a))) redirect("/dashboard/forbidden");
  const t = await getTranslations("activities");
  const tn = await getTranslations("nav");
  const locale = await getLocale();
  const opts = await activityFormOptions();
  const admin = can(user, "members.read_all") || can(user, "groups.manage");
  const mine = admin ? null : await myGroupIds(user);
  const groups = opts.groups.filter((g) => !mine || mine.includes(g.id) || g.id === a.groupId);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("edit")}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title"), href: "/dashboard/activities" }, { label: a.title, href: `/dashboard/activities/${id}` }, { label: t("edit") }]}
      />
      <ActivityForm
        initial={{ ...a, monitorId: a.monitor?.id ?? null }}
        monitors={opts.monitors.map((m) => ({ id: m.id, name: `${m.firstName} ${m.lastName}` }))}
        groups={groups}
        events={opts.events.map((e) => ({ id: e.id, name: `${e.title} · ${formatDate(e.startAt, locale)}` }))}
      />
    </div>
  );
}

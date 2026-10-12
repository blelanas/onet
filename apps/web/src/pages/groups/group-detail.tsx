import { useTranslations } from "use-intl";
import { CalendarClock, ClipboardCheck, Edit, MapPin, Trash2, Users } from "lucide-react";
import type { groupPage } from "@api/modules/groups/routes";
import { can, useMe } from "@/lib/auth";
import { useApi } from "@/lib/query";
import { useParams, useSearchParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { deleteGroup } from "@/api/groups";
import { RequirePerm } from "@/components/states/guards";
import { QueryView } from "@/components/states/page-state";
import { LinkButton } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Breadcrumbs } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { LinkTabs } from "@/components/ui/tabs";
import { GroupIcon } from "@/components/groups/group-icon";
import { MembersTab } from "@/components/groups/tabs/members-tab";
import { MonitorsTab } from "@/components/groups/tabs/monitors-tab";
import { ScheduleTab } from "@/components/groups/tabs/schedule-tab";
import { AttendanceTab } from "@/components/groups/tabs/attendance-tab";
import { ActivitiesTab } from "@/components/groups/tabs/activities-tab";
import { AnnouncementsTab } from "@/components/groups/tabs/announcements-tab";
import { TasksTab } from "@/components/groups/tabs/tasks-tab";

const TABS = ["members", "monitors", "schedule", "attendance", "activities", "announcements", "tasks"] as const;

type Data = Loaded<typeof groupPage>;

export function Component() {
  return (
    <RequirePerm perm="groups.read">
      <GroupDetail />
    </RequirePerm>
  );
}

function GroupDetail() {
  const { id } = useParams();
  const query = useApi<Data>(`/groups/${id}`);
  return <QueryView query={query}>{(data) => <GroupView id={id!} data={data} />}</QueryView>;
}

function GroupView({ id, data }: { id: string; data: Data }) {
  const user = useMe();
  const sp = useSearchParams();
  const { group: g, canWork } = data;
  usePageTitle(g.name);
  const tabParam = sp.get("tab") ?? "";
  const tab = (TABS as readonly string[]).includes(tabParam) ? (tabParam as (typeof TABS)[number]) : "members";
  const t = useTranslations("groups");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const canManage = can(user, "groups.manage");
  const base = `/dashboard/groups/${id}`;
  const full = g._count.children >= g.capacity;

  const tabs = TABS.map((k) => ({
    key: k,
    label: t(`tabs.${k}`),
    href: k === "members" ? base : `${base}?tab=${k}`,
    count: k === "members" ? g._count.children : k === "monitors" ? g.monitors.length : k === "activities" ? g._count.activities : k === "tasks" ? g._count.tasks : undefined,
  }));

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title"), href: "/dashboard/groups" }, { label: g.name }]} />

      <div className="card overflow-hidden">
        <div className="relative h-28 sm:h-36" style={{ background: `linear-gradient(120deg, ${g.color}, ${g.color}B3 60%, #FFB400AA)` }}>
          <div className="bg-confetti absolute inset-0 opacity-70" />
          <GroupIcon icon={g.icon} className="absolute end-6 top-1/2 size-24 -translate-y-1/2 text-white/20 sm:size-32" />
        </div>
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:px-6">
          <span className="-mt-10 grid size-20 shrink-0 place-items-center rounded-3xl border-4 border-surface text-white shadow-lg sm:-mt-12 sm:size-24" style={{ background: g.color }}>
            <GroupIcon icon={g.icon} className="size-9 sm:size-11" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{g.name}</h1>
            {g.description && <p className="mt-0.5 text-sm text-muted">{g.description}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-2">
              {g.ageMin != null && (
                <span className="rounded-full px-2.5 py-0.5 text-xs font-extrabold" style={{ background: `${g.color}1A`, color: g.color }}>
                  {g.ageMax != null ? t("card.ages", { min: g.ageMin, max: g.ageMax }) : t("card.agesFrom", { min: g.ageMin })}
                </span>
              )}
              {g.meetingDay != null && (
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="size-4 text-muted" /> {tc(`enums.weekday.${g.meetingDay}`)} {g.meetingTime && <span dir="ltr">{g.meetingTime}</span>}
                </span>
              )}
              {g.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4 text-muted" /> {g.location}
                </span>
              )}
              {!g.isActive && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold text-muted">{tc("status.INACTIVE")}</span>}
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-56">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1 text-ink-2">
                  <Users className="size-3.5" /> {t("card.fill", { count: g._count.children, capacity: g.capacity })}
                </span>
                {full && <span className="text-red-600">{tc("status.FULL")}</span>}
              </div>
              <Progress value={g._count.children} max={g.capacity} color={full ? "#E30613" : g.color} />
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {canWork && can(user, "attendance.manage") && (
                <LinkButton href={`/dashboard/attendance?ctx=group:${id}`} variant="soft" size="sm">
                  <ClipboardCheck className="size-4" /> {t("takeAttendance")}
                </LinkButton>
              )}
              {canManage && (
                <>
                  <LinkButton href={`${base}/edit`} variant="outline" size="sm">
                    <Edit className="size-4" /> {tc("actions.edit")}
                  </LinkButton>
                  <ConfirmButton action={deleteGroup.bind(null, id)} variant="outline" size="sm" title={t("deleteTitle")} description={t("deleteText")} redirectTo="/dashboard/groups" ariaLabel={tc("actions.delete")}>
                    <Trash2 className="size-4 text-red-600" />
                  </ConfirmButton>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <LinkTabs tabs={tabs} active={tab} className="mb-0" />

      {tab === "members" && <MembersTab group={g} />}
      {tab === "monitors" && <MonitorsTab group={g} />}
      {tab === "schedule" && <ScheduleTab group={g} />}
      {tab === "attendance" && <AttendanceTab group={g} />}
      {tab === "activities" && <ActivitiesTab groupId={id} />}
      {tab === "announcements" && <AnnouncementsTab groupId={id} />}
      {tab === "tasks" && <TasksTab group={g} canWork={canWork} />}
    </div>
  );
}

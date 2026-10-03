import { useLocale, useTranslations } from "use-intl";
import { CalendarClock, Circle, CircleCheck, CircleDot, ListChecks, Trash2 } from "lucide-react";
import type { groupTasksTab } from "@api/modules/groups/routes";
import { formatDate, startOfDay } from "@onet/shared";
import { useMe } from "@/lib/auth";
import { useApi } from "@/lib/query";
import type { Loaded } from "@/lib/types";
import { cn } from "@/lib/utils";
import { cycleTaskStatus, deleteGroupTask } from "@/api/groups";
import { QueryView } from "@/components/states/page-state";
import { ActionButton, ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import { NewTaskForm } from "../group-forms";
import { TabSkeleton } from "../grid-skeleton";
import type { Group } from "../types";

type Data = Loaded<typeof groupTasksTab>;

export function TasksTab({ group, canWork }: { group: Group; canWork: boolean }) {
  const query = useApi<Data>(`/groups/${group.id}/tasks`);
  return <QueryView query={query} skeleton={<TabSkeleton />}>{(data) => <TasksPanel group={group} canWork={canWork} tasks={data.tasks} />}</QueryView>;
}

function TasksPanel({ group, canWork, tasks }: { group: Group; canWork: boolean; tasks: Data["tasks"] }) {
  const t = useTranslations("groups.tasks");
  const tc = useTranslations("common");
  const locale = useLocale();
  const user = useMe();
  const today = startOfDay();
  const assignees = group.monitors.filter((m) => m.member.userId).map((m) => ({ id: m.member.userId!, name: `${m.member.firstName} ${m.member.lastName}` }));
  const done = tasks.filter((x) => x.status === "DONE").length;

  return (
    <Section title={t("title")} action={tasks.length ? <span className="text-sm font-bold text-muted">{t("progress", { done, total: tasks.length })}</span> : undefined}>
      {canWork && <NewTaskForm groupId={group.id} assignees={assignees.filter((a) => a.id !== user.id)} />}
      {tasks.length ? (
        <ul className="divide-y divide-line">
          {tasks.map((task) => {
            const overdue = task.dueDate && task.status !== "DONE" && task.dueDate < today;
            const Icon = task.status === "DONE" ? CircleCheck : task.status === "IN_PROGRESS" ? CircleDot : Circle;
            return (
              <li key={task.id} className="flex items-center gap-3 py-3">
                {canWork ? (
                  <ActionButton action={cycleTaskStatus.bind(null, task.id)} variant="ghost" size="icon-sm" ariaLabel={t("cycle")} successMessage="toast.saved">
                    <Icon className={cn("size-5", task.status === "DONE" ? "text-emerald-600" : task.status === "IN_PROGRESS" ? "text-sky-600" : "text-muted")} />
                  </ActionButton>
                ) : (
                  <Icon className="size-5 text-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={cn("font-bold text-ink", task.status === "DONE" && "text-muted line-through")}>{task.title}</p>
                  <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
                    {task.dueDate && (
                      <span className={cn("inline-flex items-center gap-1", overdue && "font-bold text-red-600")}>
                        <CalendarClock className="size-3.5" /> {formatDate(task.dueDate, locale)}
                      </span>
                    )}
                    {task.assignee && <span>{task.assignee.name}</span>}
                  </p>
                </div>
                <StatusBadge status={task.status} className="hidden sm:inline-flex" />
                {canWork && (
                  <ConfirmButton action={deleteGroupTask.bind(null, task.id)} size="icon-sm" ariaLabel={tc("actions.delete")}>
                    <Trash2 className="size-4 text-muted" />
                  </ConfirmButton>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState compact title={t("empty")} icon={<ListChecks className="size-4" />} />
      )}
    </Section>
  );
}

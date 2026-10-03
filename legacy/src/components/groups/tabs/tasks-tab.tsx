import { getLocale, getTranslations } from "next-intl/server";
import { CalendarClock, Circle, CircleCheck, CircleDot, ListChecks, Trash2 } from "lucide-react";
import type { CurrentUser } from "@/lib/auth/session";
import { formatDate, startOfDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { cycleTaskStatus, deleteGroupTask } from "@/server/groups/actions";
import { groupTasks, type getGroup } from "@/server/groups/queries";
import { ActionButton, ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import { NewTaskForm } from "../group-forms";

type Group = Awaited<ReturnType<typeof getGroup>>;

export async function TasksTab({ user, group, canWork }: { user: CurrentUser; group: Group; canWork: boolean }) {
  const t = await getTranslations("groups.tasks");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const tasks = await groupTasks(group.id);
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

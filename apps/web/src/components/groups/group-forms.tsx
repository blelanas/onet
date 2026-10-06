import { useTranslations } from "use-intl";
import { Plus } from "lucide-react";
import { assignMonitor, createGroupTask } from "@/api/groups";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/input";

export function AssignMonitorForm({ groupId, options }: { groupId: string; options: { id: string; firstName: string; lastName: string }[] }) {
  const t = useTranslations("groups.monitors");
  if (!options.length) return null;
  return (
    <ActionForm action={assignMonitor} resetOnSuccess className="mt-5 rounded-2xl border border-dashed border-line bg-surface-2/40 p-4">
      {(pending) => (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="groupId" value={groupId} />
          <Select name="memberId" label={t("assign")} options={options.map((o) => ({ value: o.id, label: `${o.firstName} ${o.lastName}` }))} wrapperClassName="flex-1" required />
          <Checkbox name="isLead" label={t("lead")} className="sm:pb-2" />
          <Button type="submit" loading={pending}>
            <Plus className="size-4" /> {t("assignButton")}
          </Button>
        </div>
      )}
    </ActionForm>
  );
}

export function NewTaskForm({ groupId, assignees }: { groupId: string; assignees: { id: string; name: string }[] }) {
  const t = useTranslations("groups.tasks");
  return (
    <ActionForm action={createGroupTask} resetOnSuccess successMessage="toast.created" className="mb-5 rounded-2xl border border-dashed border-line bg-surface-2/40 p-4">
      {(pending) => (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
          <input type="hidden" name="groupId" value={groupId} />
          <Input name="title" label={t("newTitle")} placeholder={t("placeholder")} required maxLength={160} />
          <Input name="dueDate" type="date" label={t("due")} />
          {assignees.length > 0 && <Select name="assigneeId" label={t("assignee")} placeholder={t("me")} options={assignees.map((a) => ({ value: a.id, label: a.name }))} />}
          <Button type="submit" loading={pending}>
            <Plus className="size-4" /> {t("add")}
          </Button>
        </div>
      )}
    </ActionForm>
  );
}

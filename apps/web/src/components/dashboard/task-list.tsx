import { useLocale, useTranslations } from "use-intl";
import { useOptimistic, useTransition } from "react";
import { refreshAll } from "@/lib/query";
import { Check, Circle, Loader2, PlayCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { setMyTaskStatus } from "@/api/dashboard";

type Task = { id: string; title: string; description: string | null; status: string; dueDate: Date | null; group: { name: string; color: string } | null };

/** Monitor's own tasks with one-tap status changes (optimistic). */
export function TaskList({ tasks }: { tasks: Task[] }) {
  const t = useTranslations("dashboard.monitor");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [pending, start] = useTransition();
  const [items, setOptimistic] = useOptimistic(tasks, (state, patch: { id: string; status: string }) => state.map((x) => (x.id === patch.id ? { ...x, status: patch.status } : x)));

  const change = (id: string, status: string) =>
    start(async () => {
      setOptimistic({ id, status });
      const res = await setMyTaskStatus(id, status);
      if (res.ok) {
        toast.success(tc("toast.saved"));
        // Keep the optimistic state until the refetched dashboard arrives.
        await refreshAll();
      } else toast.error(tc(res.error));
    });

  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-TN-u-nu-latn" : locale, { day: "numeric", month: "short" });
  if (!items.length) return <p className="rounded-2xl bg-surface-2/60 px-4 py-6 text-center text-sm text-muted">{t("noTasks")}</p>;
  return (
    <ul className="space-y-2" aria-busy={pending || undefined}>
      {items.map((task) => {
        const done = task.status === "DONE";
        const late = !done && task.dueDate && new Date(task.dueDate) < new Date();
        return (
          <li key={task.id} className={cn("flex items-start gap-3 rounded-2xl border border-line p-3 transition", done && "bg-surface-2/50")}>
            <button
              type="button"
              onClick={() => change(task.id, done ? "TODO" : "DONE")}
              className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 transition", done ? "border-leaf bg-leaf text-white" : "border-line text-transparent hover:border-leaf hover:text-leaf")}
              aria-label={done ? t("reopen") : t("done")}
              aria-pressed={done}
            >
              <Check className="size-3.5" strokeWidth={3} />
            </button>
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-bold", done ? "text-muted line-through" : "text-ink")}>{task.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                {task.status === "IN_PROGRESS" && (
                  <span className="inline-flex items-center gap-1 font-bold text-sky-700">
                    <Circle className="size-2.5 fill-current" /> {tc("status.IN_PROGRESS")}
                  </span>
                )}
                {task.dueDate && <span className={cn(late && "font-bold text-red-600")}>{t("due", { date: fmt.format(new Date(task.dueDate)) })}</span>}
                {task.group && (
                  <span className="inline-flex items-center gap-1 font-semibold" style={{ color: task.group.color }}>
                    <span className="size-2 rounded-full" style={{ background: task.group.color }} /> {task.group.name}
                  </span>
                )}
              </div>
            </div>
            {task.status === "TODO" && (
              <button type="button" onClick={() => change(task.id, "IN_PROGRESS")} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-sky-700 hover:bg-sky-soft">
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <PlayCircle className="size-3.5" />} {t("start")}
              </button>
            )}
            {done && (
              <button type="button" onClick={() => change(task.id, "TODO")} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-muted hover:bg-surface-2" aria-label={t("reopen")}>
                <RotateCcw className="size-3.5" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

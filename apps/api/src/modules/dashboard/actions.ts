import { revalidatePath } from "@api/lib/cache";
import { z } from "zod";
import { db } from "@api/lib/db";
import { AuthError, requirePermission } from "@api/lib/auth/guards";
import { runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { TASK_STATUSES } from "@api/lib/constants";

const taskStatusSchema = z.object({ id: zs.id, status: z.enum(TASK_STATUSES) });

/** A monitor updates the status of a task assigned to them (only their own tasks). */
export async function setMyTaskStatus(id: string, status: string) {
  return runAction(taskStatusSchema, { id, status }, async (d) => {
    const user = await requirePermission("tasks.manage");
    const task = await db.task.findUnique({ where: { id: d.id }, select: { assigneeId: true, status: true } });
    if (!task) throw new AuthError("NOT_FOUND");
    if (task.assigneeId !== user.id) throw new AuthError("FORBIDDEN");
    await db.task.update({ where: { id: d.id }, data: { status: d.status } });
    await audit(user.id, "update", "Task", d.id, { from: task.status, to: d.status });
    revalidatePath("/dashboard");
  });
}

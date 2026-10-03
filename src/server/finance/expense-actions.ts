"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError } from "@/lib/auth/guards";
import { formToObject, runAction, zs } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { requireFinance } from "./access";

const expenseSchema = z.object({
  id: zs.optId,
  category: z.enum(EXPENSE_CATEGORIES),
  amount: zs.money.refine((v) => v > 0, "errors.required"),
  date: zs.reqDate,
  description: zs.reqStr(300),
  supplier: zs.optStr,
  attachmentUrl: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().regex(/^\/uploads\//).optional()),
  link: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().regex(/^(event|trip):.+$/).optional()),
});

export async function saveExpense(fd: FormData) {
  return runAction(expenseSchema, formToObject(fd), async ({ id, link, ...data }) => {
    const { user } = await requireFinance({ manage: true });
    const [kind, refId] = link ? link.split(":") : [];
    const fields = {
      ...data,
      supplier: data.supplier ?? null,
      attachmentUrl: data.attachmentUrl ?? null,
      eventId: kind === "event" ? refId : null,
      tripId: kind === "trip" ? refId : null,
    };
    if (id) {
      if (!(await db.expense.findUnique({ where: { id }, select: { id: true } }))) throw new AuthError("NOT_FOUND");
      await db.expense.update({ where: { id }, data: fields });
    }
    const e = id ? { id } : await db.expense.create({ data: { ...fields, createdById: user.id } });
    await audit(user.id, id ? "update" : "create", "Expense", e.id, { amount: data.amount, category: data.category, description: data.description });
    revalidatePath("/dashboard/finance", "layout");
    return { id: e.id };
  });
}

export async function deleteExpense(id: string) {
  return runAction(zs.id, id, async (expenseId) => {
    const { user } = await requireFinance({ manage: true });
    const e = await db.expense.findUnique({ where: { id: expenseId } });
    if (!e) throw new AuthError("NOT_FOUND");
    await db.expense.delete({ where: { id: expenseId } });
    await audit(user.id, "delete", "Expense", expenseId, { amount: e.amount, category: e.category, description: e.description });
    revalidatePath("/dashboard/finance", "layout");
  });
}

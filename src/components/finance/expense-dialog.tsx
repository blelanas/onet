"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Plus } from "lucide-react";
import { saveExpense } from "@/server/finance/expense-actions";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { toDateInput } from "@/lib/dates";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Upload } from "@/components/ui/upload";

export type ExpenseValues = {
  id: string;
  category: string;
  amount: number;
  date: Date | string;
  description: string;
  supplier: string | null;
  attachmentUrl: string | null;
  eventId: string | null;
  tripId: string | null;
};
type Opt = { id: string; title: string };

/** Create (no `initial`) or edit an expense in a modal / bottom sheet. */
export function ExpenseDialog({ initial, events, trips }: { initial?: ExpenseValues; events: Opt[]; trips: Opt[] }) {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const link = initial?.eventId ? `event:${initial.eventId}` : initial?.tripId ? `trip:${initial.tripId}` : "";

  return (
    <>
      {initial ? (
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} aria-label={t("actions.editExpense")}>
          <Pencil className="size-4" />
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> {t("actions.newExpense")}
        </Button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={initial ? t("actions.editExpense") : t("actions.newExpense")} size="lg">
        <ActionForm action={saveExpense} successMessage={initial ? "toast.saved" : "toast.created"} onSuccess={() => setOpen(false)} resetOnSuccess={!initial} className="space-y-4">
          {(pending) => (
            <>
              {initial && <input type="hidden" name="id" value={initial.id} />}
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="description" label={t("form.description")} defaultValue={initial?.description} required wrapperClassName="sm:col-span-2" />
                <Select name="category" label={t("form.category")} defaultValue={initial?.category ?? "MATERIALS"} required options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: tc(`enums.expenseCategory.${c}`) }))} />
                <Input name="amount" type="number" inputMode="decimal" step="0.001" min="0" label={t("form.amount")} defaultValue={initial ? initial.amount / 1000 : ""} required dir="ltr" className="font-bold tabular-nums" />
                <Input name="date" type="date" label={t("form.date")} defaultValue={toDateInput(initial?.date ?? new Date())} required />
                <Input name="supplier" label={t("form.supplier")} defaultValue={initial?.supplier ?? ""} />
                <Select
                  name="link"
                  label={t("form.linkExpense")}
                  defaultValue={link}
                  placeholder={t("form.noLink")}
                  options={[...events.map((e) => ({ value: `event:${e.id}`, label: `${t("invoice.event")} · ${e.title}` })), ...trips.map((x) => ({ value: `trip:${x.id}`, label: `${t("invoice.trip")} · ${x.title}` }))]}
                  wrapperClassName="sm:col-span-2"
                />
                <Upload name="attachmentUrl" kind="document" label={t("form.attachment")} defaultValue={initial?.attachmentUrl} className="sm:col-span-2" />
              </div>
              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  {tc("actions.cancel")}
                </Button>
                <Button type="submit" loading={pending}>
                  {tc("actions.save")}
                </Button>
              </div>
            </>
          )}
        </ActionForm>
      </Modal>
    </>
  );
}

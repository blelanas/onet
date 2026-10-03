"use client";
import { useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FilePen, Send } from "lucide-react";
import { saveInvoice } from "@/server/finance/actions";
import { toDateInput, addDays } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";

type Opt = { id: string; title: string; price?: number };
export type InvoiceFormOptions = {
  payers: { id: string; name: string; type: string; children: { id: string; name: string }[] }[];
  events: Opt[];
  trips: Opt[];
  activities: Opt[];
};
export type InvoiceFormValues = {
  id?: string;
  payerId?: string;
  childId?: string | null;
  link?: string;
  description?: string;
  amount?: number; // millimes
  dueDate?: Date | string;
  notes?: string | null;
  status?: string;
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-bold text-ink">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function InvoiceForm({ initial, options }: { initial: InvoiceFormValues; options: InvoiceFormOptions }) {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [payerId, setPayerId] = useState(initial.payerId ?? "");
  const [childId, setChildId] = useState(initial.childId ?? "");
  const [kind, setKind] = useState(initial.link?.split(":")[0] ?? "");
  const [ref, setRef] = useState(initial.link?.split(":")[1] ?? "");
  const [status, setStatus] = useState(initial.status === "DRAFT" ? "DRAFT" : "PENDING");
  const amountRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);

  const children = useMemo(() => options.payers.find((p) => p.id === payerId)?.children ?? [], [options.payers, payerId]);
  const items: Opt[] = kind === "event" ? options.events : kind === "trip" ? options.trips : kind === "activity" ? options.activities : [];
  const selected = items.find((i) => i.id === ref);

  return (
    <ActionForm action={saveInvoice} successMessage={initial.id ? "toast.saved" : "toast.created"} redirectTo={(d) => `/dashboard/finance/invoices/${d?.id}`} >
      {(pending) => (
        <div className="space-y-5">
          {initial.id && <input type="hidden" name="id" value={initial.id} />}
          <input type="hidden" name="link" value={kind && ref ? `${kind}:${ref}` : ""} />
          <input type="hidden" name="status" value={status} />

          <Block title={t("form.sectionWho")}>
            <Select
              name="payerId"
              label={t("form.payer")}
              hint={t("form.payerHint")}
              required
              value={payerId}
              onChange={(e) => {
                setPayerId(e.target.value);
                setChildId("");
              }}
              placeholder={t("form.choosePayer")}
              options={options.payers.map((p) => ({ value: p.id, label: `${p.name}${p.type === "MEMBER" ? ` (${tc("enums.memberType.MEMBER")})` : ""}` }))}
            />
            <Select name="childId" label={t("form.child")} value={childId} onChange={(e) => setChildId(e.target.value)} placeholder={t("form.noChild")} options={children.map((c) => ({ value: c.id, label: c.name }))} disabled={!children.length} />
          </Block>

          <Block title={t("form.sectionWhat")}>
            <Select
              label={t("form.linkType")}
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setRef("");
              }}
              placeholder={t("form.linkNone")}
              options={[
                { value: "event", label: t("invoice.event") },
                { value: "trip", label: t("invoice.trip") },
                { value: "activity", label: t("invoice.activity") },
              ]}
            />
            <div className="space-y-1.5">
              <Select
                label={t("form.linkItem")}
                value={ref}
                disabled={!kind}
                onChange={(e) => {
                  setRef(e.target.value);
                  const it = items.find((i) => i.id === e.target.value);
                  if (it && descRef.current && !descRef.current.value) descRef.current.value = `${t(`invoice.${kind as "event" | "trip" | "activity"}`)} : ${it.title}`;
                }}
                placeholder={t("form.choose")}
                options={items.map((i) => ({ value: i.id, label: i.title }))}
              />
              {selected?.price ? (
                <button type="button" className="text-xs font-bold text-brand-600 hover:underline" onClick={() => amountRef.current && (amountRef.current.value = String(selected.price! / 1000))}>
                  {t("form.usePrice", { amount: formatMoney(selected.price, locale) })}
                </button>
              ) : null}
            </div>
            <Input ref={descRef} name="description" label={t("form.description")} placeholder={t("form.descriptionPlaceholder")} defaultValue={initial.description} required wrapperClassName="sm:col-span-2" />
            <Input
              ref={amountRef}
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.001"
              min="0"
              label={t("form.amount")}
              hint={t("form.amountHint")}
              defaultValue={initial.amount != null ? initial.amount / 1000 : ""}
              required
              dir="ltr"
              className="font-bold tabular-nums"
            />
            <Input name="dueDate" type="date" label={t("form.dueDate")} defaultValue={toDateInput(initial.dueDate ?? addDays(new Date(), 30))} required />
            <Textarea name="notes" label={t("form.notes")} defaultValue={initial.notes ?? ""} rows={3} wrapperClassName="sm:col-span-2" />
          </Block>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-3 text-lg font-bold text-ink">{t("form.status")}</h2>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
              {(["PENDING", "DRAFT"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={status === s}
                  onClick={() => setStatus(s)}
                  className={cn("flex items-center gap-3 rounded-2xl border-2 p-4 text-start transition", status === s ? (s === "PENDING" ? "border-brand-500 bg-brand-50" : "border-ink bg-surface-2") : "border-line hover:border-brand-200")}
                >
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", s === "PENDING" ? "bg-brand-600 text-white" : "bg-ink text-white")}>{s === "PENDING" ? <Send className="size-5" /> : <FilePen className="size-5" />}</span>
                  <span className="text-sm font-bold text-ink">{s === "PENDING" ? t("form.statusPending") : t("form.statusDraft")}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="sticky bottom-20 z-10 flex justify-end gap-2 rounded-2xl border border-line bg-surface/90 p-3 shadow-[var(--shadow-lift)] backdrop-blur lg:bottom-4">
            <Button variant="outline" onClick={() => history.back()}>
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" loading={pending}>
              {tc("actions.save")}
            </Button>
          </div>
        </div>
      )}
    </ActionForm>
  );
}

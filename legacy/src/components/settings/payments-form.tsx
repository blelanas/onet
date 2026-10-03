"use client";
import { useTranslations } from "next-intl";
import { Banknote, Building2, CreditCard, FileCheck2, Globe, Wallet } from "lucide-react";
import { savePaymentSettings } from "@/server/settings/actions";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PAYMENT_METHODS } from "@/lib/constants";
import { SettingsCard } from "./settings-card";

const ICONS = { CASH: Banknote, BANK_TRANSFER: Building2, ONLINE: Globe, CHECK: FileCheck2, OTHER: Wallet } as const;

export function PaymentsForm({ methods, bank, feeTnd }: { methods: string[]; bank: { bank?: string; holder?: string; rib?: string; iban?: string }; feeTnd: string }) {
  const t = useTranslations("settings.payments");
  const tc = useTranslations("common");
  return (
    <ActionForm action={savePaymentSettings} className="space-y-5">
      {(pending) => (
        <>
          <SettingsCard title={t("methods")} description={t("methodsHint")}>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {PAYMENT_METHODS.map((m) => {
                const Icon = ICONS[m];
                return (
                  <label key={m} className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-line p-3 transition has-[:checked]:border-leaf has-[:checked]:bg-leaf-soft/50">
                    <input type="checkbox" name="methods[]" value={m} defaultChecked={methods.includes(m)} className="size-4 accent-emerald-600" />
                    <Icon className="size-5 text-emerald-700" />
                    <span className="text-sm font-bold text-ink">{tc(`enums.paymentMethod.${m}`)}</span>
                  </label>
                );
              })}
            </div>
          </SettingsCard>
          <SettingsCard title={t("bank")} description={t("bankHint")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="bank" label={t("bankName")} defaultValue={bank.bank} />
              <Input name="holder" label={t("holder")} defaultValue={bank.holder} />
              <Input name="rib" label={t("rib")} defaultValue={bank.rib} dir="ltr" className="font-mono" />
              <Input name="iban" label={t("iban")} defaultValue={bank.iban} dir="ltr" className="font-mono" />
            </div>
          </SettingsCard>
          <SettingsCard title={t("fee")} description={t("feeHint")}>
            <div className="max-w-xs">
              <Input name="membershipFee" type="number" min={0} step="0.001" defaultValue={feeTnd} dir="ltr" icon={<CreditCard className="size-4" />} aria-label={t("fee")} />
            </div>
          </SettingsCard>
          <div className="sticky bottom-20 z-10 flex justify-end rounded-2xl border border-line bg-surface/90 p-3 shadow-[var(--shadow-lift)] backdrop-blur lg:bottom-4">
            <Button type="submit" loading={pending}>
              {tc("actions.save")}
            </Button>
          </div>
        </>
      )}
    </ActionForm>
  );
}

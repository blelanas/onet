import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth/guards";
import { getSetting, type BankDetails } from "@/server/settings/store";
import { PaymentsForm } from "@/components/settings/payments-form";

export async function generateMetadata() {
  const t = await getTranslations("settings.nav");
  return { title: t("payments") };
}

export default async function PaymentSettingsPage() {
  await requirePagePermission("settings.manage");
  const [methods, bank, fee] = await Promise.all([
    getSetting<string[]>("payments.methods", ["CASH", "BANK_TRANSFER"]),
    getSetting<BankDetails>("payments.bank", {}),
    getSetting<number>("finance.membershipFee", 0),
  ]);
  return <PaymentsForm methods={Array.isArray(methods) ? methods : []} bank={bank ?? {}} feeTnd={String((Number(fee) || 0) / 1000)} />;
}

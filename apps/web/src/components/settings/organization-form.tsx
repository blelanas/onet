import { useTranslations } from "use-intl";
import { Globe, Info } from "lucide-react";
import { saveOrganization } from "@/api/settings";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "@/components/ui/upload";
import { SettingsCard } from "./settings-card";

type Profile = {
  name?: string;
  fullName?: string;
  fullNameAr?: string;
  email?: string;
  phone?: string;
  address?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  website?: string;
  foundedYear?: number;
};

export function OrganizationForm({ profile, logoUrl }: { profile: Profile; logoUrl: string | null }) {
  const t = useTranslations("settings.organization");
  const tc = useTranslations("common");
  return (
    <ActionForm action={saveOrganization} className="space-y-5">
      {(pending) => (
        <>
          <SettingsCard title={t("identity")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="name" label={t("name")} defaultValue={profile.name} required />
              <Input name="foundedYear" type="number" min={1900} max={2100} label={t("foundedYear")} defaultValue={profile.foundedYear} dir="ltr" />
              <Input name="fullName" label={t("fullName")} defaultValue={profile.fullName} wrapperClassName="sm:col-span-2" dir="ltr" />
              <Input name="fullNameAr" label={t("fullNameAr")} defaultValue={profile.fullNameAr} wrapperClassName="sm:col-span-2" dir="rtl" lang="ar" />
            </div>
          </SettingsCard>
          <SettingsCard title={t("contact")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="email" type="email" label={t("email")} defaultValue={profile.email} dir="ltr" />
              <Input name="phone" type="tel" label={t("phone")} defaultValue={profile.phone} dir="ltr" />
              <Input name="address" label={t("address")} defaultValue={profile.address} wrapperClassName="sm:col-span-2" />
            </div>
          </SettingsCard>
          <SettingsCard title={t("social")}>
            <div className="grid gap-4 sm:grid-cols-2">
              {(["facebook", "instagram", "youtube", "website"] as const).map((k) => (
                <Input key={k} name={k} type="url" label={t(k)} defaultValue={profile[k]} dir="ltr" placeholder="https://" icon={<Globe className="size-4" />} />
              ))}
            </div>
          </SettingsCard>
          <SettingsCard title={t("logo")}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex shrink-0 flex-col items-center gap-2">
                <div className="grid size-24 place-items-center rounded-3xl border border-line bg-surface-2/60 p-3">
                  <img src="/brand/onet-mark.svg" alt="" className="size-full object-contain" />
                </div>
                <span className="text-[11px] font-bold text-muted">{t("currentMark")}</span>
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <p className="flex items-start gap-2 rounded-2xl bg-sky-soft p-3 text-sm text-sky-800">
                  <Info className="mt-0.5 size-4 shrink-0" /> {t("logoNote")}
                </p>
                <Upload name="logoUrl" kind="image" label={t("uploadLogo")} defaultValue={logoUrl} />
              </div>
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

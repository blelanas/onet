import { useLocale, useTranslations } from "use-intl";
import { isLocale } from "@onet/shared";
import { useLocaleSwitch } from "@/lib/i18n";
import { useState } from "react";
import { KeyRound, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { changePassword, updateProfile } from "@/api/profile";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "@/components/ui/upload";

const LANGS = [
  { value: "fr", label: "Français", flag: "FR" },
  { value: "ar", label: "العربية", flag: "ع" },
  { value: "en", label: "English", flag: "EN" },
];

export function ProfileForm({ defaults }: { defaults: { name: string; phone: string | null; avatarUrl: string | null; locale: string } }) {
  const t = useTranslations("dashboard.profile");
  const tc = useTranslations("common");
  const uiLocale = useLocale();
  // The UI language is the effective preference (it is saved to the account when switched).
  const [locale, setLocale] = useState<string>(uiLocale);
  const { setLocale: switchLocale } = useLocaleSwitch();
  return (
    <ActionForm
      action={updateProfile}
      onSuccess={() => {
        // The account already stores the new language; switch the UI to it too.
        if (locale !== uiLocale && isLocale(locale)) void switchLocale(locale);
      }}
    >
      {(pending) => (
        <div className="space-y-5">
          <Upload name="avatarUrl" kind="image" defaultValue={defaults.avatarUrl} label={t("avatar")} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input name="name" label={t("name")} defaultValue={defaults.name} required autoComplete="name" />
            <Input name="phone" label={t("phone")} defaultValue={defaults.phone ?? ""} dir="ltr" inputMode="tel" autoComplete="tel" placeholder="+216 …" className="text-start" />
          </div>
          <fieldset>
            <legend className="mb-1.5 text-sm font-bold text-ink-2">{t("language")}</legend>
            <div className="grid grid-cols-3 gap-2" role="radiogroup">
              {LANGS.map((l) => (
                <label key={l.value} className={cn("flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition", locale === l.value ? "border-brand-400 bg-brand-50 text-brand-700 ring-4 ring-brand-100" : "border-line hover:border-brand-200")}>
                  <input type="radio" name="locale" value={l.value} checked={locale === l.value} onChange={() => setLocale(l.value)} className="sr-only" />
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface-2 text-xs font-extrabold text-ink-2">{l.flag}</span>
                  <span lang={l.value} className="truncate">
                    {l.label}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">{t("languageHint")}</p>
          </fieldset>
          <div className="flex justify-end">
            <Button type="submit" loading={pending}>
              <Save className="size-4" /> {tc("actions.save")}
            </Button>
          </div>
        </div>
      )}
    </ActionForm>
  );
}

function strength(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Za-z]/.test(p) && /\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p) || (/[a-z]/.test(p) && /[A-Z]/.test(p))) s++;
  return s;
}

export function PasswordForm() {
  const t = useTranslations("dashboard.profile");
  const [pw, setPw] = useState("");
  const s = strength(pw);
  const level = s <= 1 ? "weak" : s <= 2 ? "medium" : "strong";
  const color = { weak: "#E30613", medium: "#D98B00", strong: "#1E9460" }[level];
  return (
    <ActionForm action={changePassword} successMessage={t("passwordChanged")} resetOnSuccess onSuccess={() => setPw("")}>
      {(pending) => (
        <div className="space-y-4">
          <Input name="current" type="password" label={t("currentPassword")} autoComplete="current-password" required />
          <div>
            <Input name="password" type="password" label={t("newPassword")} autoComplete="new-password" required hint={t("passwordHint")} value={pw} onChange={(e) => setPw(e.target.value)} />
            {pw && (
              <div className="mt-2 flex items-center gap-2" aria-live="polite">
                <div className="flex flex-1 gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="h-1.5 flex-1 rounded-full bg-surface-2" style={i < Math.max(1, s) ? { background: color } : undefined} />
                  ))}
                </div>
                <span className="text-xs font-bold" style={{ color }}>
                  {t(`strength.${level}`)}
                </span>
              </div>
            )}
          </div>
          <Input name="confirm" type="password" label={t("confirmPassword")} autoComplete="new-password" required />
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" loading={pending}>
              <KeyRound className="size-4" /> {t("changePassword")}
            </Button>
          </div>
        </div>
      )}
    </ActionForm>
  );
}

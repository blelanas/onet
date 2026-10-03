"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { KeyRound, Lock, Plus, ShieldCheck, Wand2 } from "lucide-react";
import { createUser, resetUserPassword, updateUserRoles } from "@/server/settings/user-actions";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useFieldError } from "@/components/ui/form-context";
import { ROLE_KEYS } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export type RoleOption = { key: string; name: string; color: string };
const PRIVILEGED = ["super_admin", "admin"];

export function useRoleLabel() {
  const tc = useTranslations("common");
  return (r: RoleOption) => ((ROLE_KEYS as readonly string[]).includes(r.key) ? tc(`roles.${r.key}`) : r.name);
}

function RoleCheckboxes({ roles, selected, canPrivileged, lockedOn = [] }: { roles: RoleOption[]; selected: string[]; canPrivileged: boolean; lockedOn?: string[] }) {
  const t = useTranslations("settings.users");
  const tc = useTranslations("common");
  const label = useRoleLabel();
  const error = useFieldError("roles");
  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-bold text-ink-2">
        {t("roles")} <span className="text-brand-600">*</span>
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {roles.map((r) => {
          const locked = lockedOn.includes(r.key);
          const disabled = locked || (PRIVILEGED.includes(r.key) && !canPrivileged);
          return (
            <label
              key={r.key}
              className={cn("flex items-center gap-3 rounded-xl border border-line p-2.5 transition has-[:checked]:border-transparent has-[:checked]:ring-2", disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer")}
              style={{ "--tw-ring-color": r.color } as React.CSSProperties}
              title={disabled && !locked ? t("lockedRole") : undefined}
            >
              <input type="checkbox" name={disabled ? undefined : "roles[]"} value={r.key} defaultChecked={selected.includes(r.key)} disabled={disabled} className="size-4 accent-brand-600" />
              {disabled && selected.includes(r.key) && <input type="hidden" name="roles[]" value={r.key} />}
              <span className="size-2.5 rounded-full" style={{ background: r.color }} />
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{label(r)}</span>
              {disabled && <Lock className="size-3.5 text-muted" />}
            </label>
          );
        })}
      </div>
      {error ? <p className="mt-1 text-xs font-semibold text-red-600">{tc(error.startsWith("errors.") ? error : "errors.validation")}</p> : <p className="mt-1 text-xs text-muted">{t("rolesHint")}</p>}
    </fieldset>
  );
}

function generatePassword() {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const buf = new Uint32Array(10);
  crypto.getRandomValues(buf);
  const pick = (set: string, n: number) => set[n % set.length];
  return Array.from(buf.slice(0, 7), (n) => pick(letters, n)).join("") + Array.from(buf.slice(7), (n) => pick(digits, n)).join("");
}

function PasswordField({ name, label }: { name: string; label: string }) {
  const t = useTranslations("settings.users");
  const [value, setValue] = useState("");
  return (
    <div className="flex items-end gap-2">
      <Input name={name} label={label} value={value} onChange={(e) => setValue(e.target.value)} required dir="ltr" autoComplete="new-password" hint={t("passwordHint")} wrapperClassName="flex-1" className="font-mono" />
      <Button variant="outline" onClick={() => setValue(generatePassword())} className="mb-[22px]">
        <Wand2 className="size-4" /> <span className="hidden sm:inline">{t("generate")}</span>
      </Button>
    </div>
  );
}

export function NewUserButton({ roles, canPrivileged }: { roles: RoleOption[]; canPrivileged: boolean }) {
  const t = useTranslations("settings.users");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" /> {t("new")}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("new")} size="lg">
        <ActionForm action={createUser} successMessage="toast.created" onSuccess={() => setOpen(false)} className="space-y-4">
          {(pending) => (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="name" label={t("name")} required autoComplete="off" />
                <Input name="email" type="email" label={tc("fields.email")} required dir="ltr" autoComplete="off" />
                <Input name="phone" type="tel" label={tc("fields.phone")} dir="ltr" />
              </div>
              <PasswordField name="password" label={t("initialPassword")} />
              <RoleCheckboxes roles={roles} selected={[]} canPrivileged={canPrivileged} />
              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  {tc("actions.cancel")}
                </Button>
                <Button type="submit" loading={pending}>
                  {tc("actions.create")}
                </Button>
              </div>
            </>
          )}
        </ActionForm>
      </Modal>
    </>
  );
}

export function EditRolesButton({ userId, userName, roles, selected, canPrivileged, isSelf }: { userId: string; userName: string; roles: RoleOption[]; selected: string[]; canPrivileged: boolean; isSelf: boolean }) {
  const t = useTranslations("settings.users");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} aria-label={t("edit")} title={t("edit")}>
        <ShieldCheck className="size-4" />
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("edit")} description={userName}>
        <ActionForm action={updateUserRoles} onSuccess={() => setOpen(false)} className="space-y-4">
          {(pending) => (
            <>
              <input type="hidden" name="userId" value={userId} />
              <RoleCheckboxes roles={roles} selected={selected} canPrivileged={canPrivileged} lockedOn={isSelf && selected.includes("super_admin") ? ["super_admin"] : []} />
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

export function ResetPasswordButton({ userId, userName }: { userId: string; userName: string }) {
  const t = useTranslations("settings.users");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} aria-label={t("resetPassword")} title={t("resetPassword")}>
        <KeyRound className="size-4" />
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("resetPassword")} description={userName}>
        <ActionForm action={resetUserPassword} onSuccess={() => setOpen(false)} className="space-y-4">
          {(pending) => (
            <>
              <input type="hidden" name="userId" value={userId} />
              <PasswordField name="password" label={t("newPassword")} />
              <p className="rounded-xl bg-sun-soft p-3 text-sm text-amber-800">{t("resetHint")}</p>
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

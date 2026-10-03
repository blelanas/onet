"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Radio, Send } from "lucide-react";
import { broadcastNotification } from "@/server/communication/notification-actions";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useFieldError } from "@/components/ui/form-context";
import { ROLE_KEYS } from "@/lib/permissions";

type RoleOpt = { key: string; name: string; color: string; users: number };

function RolePicker({ roles }: { roles: RoleOpt[] }) {
  const t = useTranslations("communication.notifications.broadcast");
  const tc = useTranslations("common");
  const error = useFieldError("roles");
  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-bold text-ink-2">
        {t("roles")} <span className="text-brand-600">*</span>
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {roles.map((r) => (
          <label key={r.key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-2.5 transition has-[:checked]:border-transparent has-[:checked]:ring-2" style={{ "--tw-ring-color": r.color } as React.CSSProperties}>
            <input type="checkbox" name="roles[]" value={r.key} className="size-4 accent-brand-600" />
            <span className="size-2.5 rounded-full" style={{ background: r.color }} />
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{(ROLE_KEYS as readonly string[]).includes(r.key) ? tc(`roles.${r.key}`) : r.name}</span>
            <span className="text-xs text-muted">{t("users", { count: r.users })}</span>
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-xs font-semibold text-red-600">{tc(error.startsWith("errors.") ? error : "errors.validation")}</p>}
    </fieldset>
  );
}

export function BroadcastButton({ roles }: { roles: RoleOpt[] }) {
  const t = useTranslations("communication.notifications.broadcast");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Radio className="size-4" /> {t("button")}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("title")} description={t("description")} size="lg">
        <ActionForm action={broadcastNotification} successMessage={t("sent")} onSuccess={() => setOpen(false)} className="space-y-4">
          {(pending) => (
            <>
              <Input name="title" label={t("titleField")} required maxLength={160} />
              <Textarea name="body" label={t("body")} rows={3} />
              <Input name="link" label={t("link")} hint={t("linkHint")} dir="ltr" placeholder="/dashboard/…" />
              <RolePicker roles={roles} />
              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  {tc("actions.cancel")}
                </Button>
                <Button type="submit" loading={pending}>
                  <Send className="rtl-flip size-4" /> {t("send")}
                </Button>
              </div>
            </>
          )}
        </ActionForm>
      </Modal>
    </>
  );
}

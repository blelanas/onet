"use client";
import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createRole, setRolePermission } from "@/server/settings/role-actions";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

/** One cell of the roles × permissions matrix (optimistic toggle). */
export function PermissionToggle({ roleId, permission, granted, disabled, color, label }: { roleId: string; permission: string; granted: boolean; disabled?: boolean; color: string; label: string }) {
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(granted);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={optimistic}
      aria-label={label}
      title={label}
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          setOptimistic(!optimistic);
          const res = await setRolePermission(roleId, permission, !optimistic);
          if (!res.ok) toast.error(tc(res.error.startsWith("errors.") ? res.error : "errors.unexpected"));
          router.refresh();
        })
      }
      className={cn(
        "grid size-7 place-items-center rounded-lg border-2 transition focus-visible:outline-2",
        optimistic ? "border-transparent text-white shadow-sm" : "border-line bg-surface text-transparent hover:border-ink/30",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      )}
      style={optimistic ? { background: color } : undefined}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin text-ink-2" /> : <Check className="size-4" strokeWidth={3} />}
    </button>
  );
}

const SWATCHES = ["#E30613", "#FF6B4A", "#FFB400", "#2BB673", "#00A3A3", "#1E9BD7", "#7C4DFF", "#E8457C", "#4A4360"];

export function NewRoleButton({ roles }: { roles: { id: string; key: string; label: string }[] }) {
  const t = useTranslations("settings.roles");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(SWATCHES[5]);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" /> {t("new")}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("new")}>
        <ActionForm action={createRole} successMessage="toast.created" onSuccess={() => setOpen(false)} className="space-y-4">
          {(pending) => (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="name" label={t("name")} required maxLength={80} />
                <Input name="key" label={t("key")} hint={t("keyHint")} required pattern="[a-z][a-z0-9_]*" dir="ltr" className="font-mono" maxLength={40} />
              </div>
              <fieldset>
                <legend className="mb-1.5 block text-sm font-bold text-ink-2">{t("color")}</legend>
                <input type="hidden" name="color" value={color} />
                <div className="flex flex-wrap gap-2">
                  {SWATCHES.map((c) => (
                    <button key={c} type="button" aria-label={c} aria-pressed={color === c} onClick={() => setColor(c)} className={cn("size-8 rounded-full ring-offset-2 transition", color === c && "ring-2")} style={{ background: c, "--tw-ring-color": c } as React.CSSProperties} />
                  ))}
                </div>
              </fieldset>
              <Textarea name="description" label={t("description")} rows={2} />
              <Select name="copyFrom" label={t("copyFrom")} placeholder={t("none")} options={roles.filter((r) => r.key !== "super_admin").map((r) => ({ value: r.id, label: r.label }))} />
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

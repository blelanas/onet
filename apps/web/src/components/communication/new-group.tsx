import { useTranslations } from "use-intl";
import { useState } from "react";
import { Users } from "lucide-react";
import { createGroup } from "@/api/communication";
import { ActionForm } from "@/components/ui/action-form";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { ContactOption } from "./compose-form";
import { PeoplePicker } from "./people-picker";

/** The create endpoint takes at most 200 invitees (the creator comes on top). */
const MAX_INVITEES = 200;

/** "New group" button: a modal with the group name and a multi-select over the user's contacts. */
export function NewGroupButton({ contacts, variant = "outline", size = "sm", className }: { contacts: ContactOption[]; variant?: ButtonVariant; size?: ButtonSize; className?: string }) {
  const t = useTranslations("communication.messages.groups");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_INVITEES) next.add(id);
      return next;
    });
  const close = () => {
    setOpen(false);
    setSelected(new Set());
  };

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        <Users className="size-4" /> {t("new")}
      </Button>
      <Modal open={open} onClose={close} title={t("createTitle")} description={t("createHint")}>
        <ActionForm action={createGroup} successMessage={t("created")} onSuccess={close} redirectTo={(d) => `/dashboard/messages?c=${(d as { id: string }).id}`} className="space-y-4">
          {(pending) => (
            <>
              <Input name="title" label={t("name")} placeholder={t("namePlaceholder")} required maxLength={80} autoComplete="off" />
              {[...selected].map((id) => (
                <input key={id} type="hidden" name="userIds[]" value={id} />
              ))}
              <div className="space-y-1.5">
                <p className="flex items-center justify-between gap-2 text-sm font-bold text-ink-2">
                  <span>
                    {t("people")}
                    <span className="ms-0.5 text-brand-600">*</span>
                  </span>
                  <span className="text-xs font-semibold text-muted">{t("selected", { count: selected.size })}</span>
                </p>
                <PeoplePicker contacts={contacts} selected={selected} onToggle={toggle} max={MAX_INVITEES} />
              </div>
              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <Button variant="outline" onClick={close}>
                  {tc("actions.cancel")}
                </Button>
                <Button type="submit" loading={pending} disabled={!selected.size}>
                  {t("create")}
                </Button>
              </div>
            </>
          )}
        </ActionForm>
      </Modal>
    </>
  );
}

import { useTranslations } from "use-intl";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { addParticipant } from "@/api/registrations";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, inputClasses } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

type Option = { id: string; firstName: string; lastName: string; type: string; age: number | null };

/** Staff: add a participant manually (modal with member picker). */
export function AddParticipantButton({ kind, targetId, members }: { kind: "event" | "trip"; targetId: string; members: Option[] }) {
  const t = useTranslations("events");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const shown = members.filter((m) => !filter || `${m.firstName} ${m.lastName}`.toLowerCase().includes(filter.toLowerCase()));
  const groups = [...new Set(shown.map((m) => m.type))];
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="size-4" /> {t("participants.add")}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("participants.add")} description={t("participants.addHint")}>
        <ActionForm action={addParticipant} successMessage="toast.registered" onSuccess={() => setOpen(false)} className="space-y-4">
          {(pending) => (
            <>
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="targetId" value={targetId} />
              <Input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={tc("actions.search")} aria-label={tc("actions.search")} />
              <Field label={t("participants.member")} name="memberId" required>
                {(id) => (
                  <select id={id} name="memberId" required size={8} className={`${inputClasses} h-56`}>
                    {groups.map((g) => (
                      <optgroup key={g} label={tc(`enums.memberType.${g}`)}>
                        {shown
                          .filter((m) => m.type === g)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.lastName} {m.firstName}
                              {m.age != null ? ` · ${tc("fields.years", { count: m.age })}` : ""}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                )}
              </Field>
              {kind === "trip" && <Checkbox name="parentConsent" label={t("participants.consentReceived")} />}
              <Input name="notes" label={tc("fields.notes")} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  {tc("actions.cancel")}
                </Button>
                <Button type="submit" loading={pending}>
                  {tc("actions.add")}
                </Button>
              </div>
            </>
          )}
        </ActionForm>
      </Modal>
    </>
  );
}

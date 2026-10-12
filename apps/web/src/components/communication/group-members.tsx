import { useTranslations } from "use-intl";
import { useState, useTransition } from "react";
import { Info, LogOut, Pencil, Shield, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { ROLE_KEYS } from "@onet/shared";
import { leaveGroup, renameGroup, updateGroup } from "@/api/communication";
import { useRouter } from "@/lib/router";
import { ActionForm } from "@/components/ui/action-form";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionButton, ConfirmButton } from "@/components/ui/confirm-button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { ContactOption } from "./compose-form";
import { PeoplePicker } from "./people-picker";

export type GroupThread = {
  id: string;
  title: string;
  participants: { userId: string; name: string; avatarUrl: string | null; isAdmin: boolean; roles: string[] }[];
  canManage: boolean;
  canLeave: boolean;
  isParticipant: boolean;
  team: { eventId: string; teamName: string; editionTitle: string } | null;
};

/** Group "Members" modal: list, and for group admins rename / add / remove / make admin; leave for everyone. */
export function GroupMembersModal({ open, onClose, thread, meId, contacts }: { open: boolean; onClose: () => void; thread: GroupThread; meId: string; contacts: ContactOption[] }) {
  const t = useTranslations("communication.messages.groups");
  const tc = useTranslations("common");
  const [adding, setAdding] = useState(false);
  const { canManage } = thread;
  const inGroup = new Set(thread.participants.map((p) => p.userId));
  const addable = contacts.filter((c) => !inGroup.has(c.id));

  const roleLabels = (roles: string[]) =>
    roles
      .filter((r) => (ROLE_KEYS as readonly string[]).includes(r))
      .map((r) => tc(`roles.${r}`))
      .join(" · ");

  return (
    <Modal open={open} onClose={onClose} title={thread.title} description={t("members", { count: thread.participants.length })}>
      <div className="space-y-5">
        {thread.team && (
          <p className="flex items-start gap-2 rounded-2xl bg-sky-soft p-3 text-sm font-semibold text-sky-800">
            <Info className="mt-0.5 size-4 shrink-0" /> {t("teamHint", { team: thread.team.teamName, edition: thread.team.editionTitle })}
          </p>
        )}
        {!thread.isParticipant && <p className="rounded-2xl bg-sun-soft p-3 text-sm font-semibold text-amber-800">{t("readOnly")}</p>}

        {canManage && (
          <ActionForm action={renameGroup} successMessage="toast.saved" className="flex items-end gap-2">
            {(pending) => (
              <>
                <input type="hidden" name="id" value={thread.id} />
                <Input name="title" label={t("name")} defaultValue={thread.title} required maxLength={80} wrapperClassName="min-w-0 flex-1" autoComplete="off" />
                <Button type="submit" variant="outline" loading={pending}>
                  {!pending && <Pencil className="size-4" />} <span className="hidden sm:inline">{t("rename")}</span>
                </Button>
              </>
            )}
          </ActionForm>
        )}

        <section>
          <h3 className="mb-2 text-xs font-extrabold tracking-wide text-muted uppercase">{t("membersTitle")}</h3>
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {thread.participants.map((p) => {
              const me = p.userId === meId;
              return (
                <li key={p.userId} className="flex items-center gap-3 p-2.5">
                  <Avatar name={p.name} src={p.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-ink">
                      <span className="truncate">{p.name}</span>
                      {me && <span className="text-xs font-semibold text-muted">({t("you")})</span>}
                      {p.isAdmin && (
                        <Badge tone="brand" className="py-0 text-[10px]">
                          {t("admin")}
                        </Badge>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted">{roleLabels(p.roles)}</p>
                  </div>
                  {canManage && !me && (
                    <div className="flex shrink-0 items-center gap-1">
                      {!p.isAdmin && (
                        <ActionButton action={() => updateGroup(thread.id, { makeAdminIds: [p.userId] })} variant="ghost" size="icon-sm" ariaLabel={`${t("makeAdmin")} — ${p.name}`}>
                          <Shield className="size-4 text-ink-2" />
                        </ActionButton>
                      )}
                      <ConfirmButton
                        action={() => updateGroup(thread.id, { removeUserIds: [p.userId] })}
                        variant="ghost"
                        size="icon-sm"
                        ariaLabel={t("remove", { name: p.name })}
                        title={t("remove", { name: p.name })}
                        description={t("removeText", { name: p.name })}
                        successMessage="toast.saved"
                      >
                        <UserMinus className="size-4 text-red-600" />
                      </ConfirmButton>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {canManage &&
          (adding ? (
            <AddMembers groupId={thread.id} contacts={addable} onDone={() => setAdding(false)} />
          ) : (
            addable.length > 0 && (
              <Button variant="soft" onClick={() => setAdding(true)}>
                <UserPlus className="size-4" /> {t("add")}
              </Button>
            )
          ))}

        {thread.canLeave && (
          <div className="border-t border-line pt-4">
            <ConfirmButton action={() => leaveGroup(thread.id)} variant="outline" size="md" title={t("leaveTitle")} description={t("leaveText")} confirmLabel={t("leave")} successMessage={t("left")} redirectTo="/dashboard/messages" className="text-red-600">
              <LogOut className="rtl-flip size-4" /> {t("leave")}
            </ConfirmButton>
          </div>
        )}
      </div>
    </Modal>
  );
}

function AddMembers({ groupId, contacts, onDone }: { groupId: string; contacts: ContactOption[]; onDone: () => void }) {
  const t = useTranslations("communication.messages.groups");
  const tc = useTranslations("common");
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const submit = () =>
    start(async () => {
      const res = await updateGroup(groupId, { addUserIds: [...selected] });
      if (res.ok) {
        toast.success(tc("toast.saved"));
        onDone();
        router.refresh();
      } else toast.error(res.error.startsWith("errors.") ? tc(res.error) : res.error);
    });
  return (
    <section className="space-y-3">
      <h3 className="flex items-center justify-between gap-2 text-xs font-extrabold tracking-wide text-muted uppercase">
        {t("add")} <span className="text-xs font-semibold tracking-normal normal-case">{t("selected", { count: selected.size })}</span>
      </h3>
      <PeoplePicker contacts={contacts} selected={selected} onToggle={toggle} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onDone}>
          {tc("actions.cancel")}
        </Button>
        <Button onClick={submit} loading={pending} disabled={!selected.size}>
          <UserPlus className="size-4" /> {t("addButton")}
        </Button>
      </div>
    </section>
  );
}

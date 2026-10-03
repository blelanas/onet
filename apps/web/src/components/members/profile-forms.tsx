import { useTranslations } from "use-intl";
import { createMemberAccount, linkGuardian } from "@/api/members";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { GUARDIAN_RELATIONS } from "@onet/shared";

export function LinkParentForm({ childId, parents }: { childId: string; parents: { id: string; firstName: string; lastName: string }[] }) {
  const t = useTranslations("people.profile");
  const tc = useTranslations("common");
  return (
    <ActionForm action={linkGuardian} resetOnSuccess className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-[1fr_150px_auto] sm:items-end">
      {(pending) => (
        <>
          <input type="hidden" name="childId" value={childId} />
          <Select name="parentId" label={t("linkParent")} placeholder="—" required options={parents.map((p) => ({ value: p.id, label: `${p.lastName} ${p.firstName}` }))} />
          <Select name="relation" label=" " aria-label={t("relation")} defaultValue="PARENT" options={GUARDIAN_RELATIONS.map((r) => ({ value: r, label: tc(`enums.relation.${r}`) }))} />
          <Button type="submit" variant="soft" loading={pending}>
            {tc("actions.add")}
          </Button>
        </>
      )}
    </ActionForm>
  );
}

export function AccountForm({ memberId, defaultEmail, defaultRole, canAdmin }: { memberId: string; defaultEmail: string; defaultRole: string; canAdmin: boolean }) {
  const t = useTranslations("people.profile");
  const tc = useTranslations("common");
  const roles = ["parent", "kid", "member", "monitor", ...(canAdmin ? ["accountant", "admin"] : [])];
  return (
    <ActionForm action={createMemberAccount} className="space-y-3">
      {(pending) => (
        <>
          <p className="text-sm text-muted">{t("noAccount")}</p>
          <input type="hidden" name="memberId" value={memberId} />
          <Input name="email" type="email" label={tc("fields.email")} defaultValue={defaultEmail} required dir="ltr" />
          <Input name="password" type="text" label={t("password")} required autoComplete="new-password" hint={tc("errors.weakPassword")} />
          <Select name="role" label={t("role")} defaultValue={defaultRole} options={roles.map((r) => ({ value: r, label: tc(`roles.${r}`) }))} />
          <Button type="submit" variant="soft" loading={pending} className="w-full">
            {t("createAccount")}
          </Button>
        </>
      )}
    </ActionForm>
  );
}

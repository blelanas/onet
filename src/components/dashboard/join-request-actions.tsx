"use client";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { approveJoinRequest } from "@/server/join-requests/actions";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";

/** Approve with an optional group override (pre-selected with the age-based suggestion). */
export function ApproveForm({ id, hasChild, groups, suggestedId, children }: { id: string; hasChild: boolean; groups: { id: string; name: string }[]; suggestedId?: string | null; children?: React.ReactNode }) {
  const t = useTranslations("dashboard.joinRequests");
  return (
    <ActionForm action={approveJoinRequest} successMessage={t("approved")} >
      {(pending) => (
        <div className="space-y-3">
          <input type="hidden" name="id" value={id} />
          {hasChild && (
            <Select
              name="groupId"
              label={t("group")}
              defaultValue={suggestedId ?? ""}
              placeholder={t("noGroup")}
              options={groups.map((g) => ({ value: g.id, label: g.id === suggestedId ? `${g.name} — ${t("suggested")}` : g.name }))}
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="success" loading={pending} className="flex-1">
              <Check className="size-4" /> {t("approve")}
            </Button>
            {children}
          </div>
        </div>
      )}
    </ActionForm>
  );
}

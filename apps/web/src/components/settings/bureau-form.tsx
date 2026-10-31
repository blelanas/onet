import { useTranslations } from "use-intl";
import { saveBureauMember } from "@/api/settings";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Upload } from "@/components/ui/upload";

export type BureauRow = { id: string; name: string; nameAr: string | null; position: string; positionAr: string | null; photoUrl: string | null; isActive: boolean };

/** Add / edit a local bureau member: photo, French and Arabic name and position, shown on the site or not. */
export function BureauFormModal({ value, onClose }: { value: BureauRow | "new" | null; onClose: () => void }) {
  const t = useTranslations("settings.bureau");
  const tc = useTranslations("common");
  const row = value && value !== "new" ? value : null;
  return (
    <Modal open={value !== null} onClose={onClose} title={row ? t("editTitle") : t("newTitle")} size="lg">
      {value !== null && (
        <ActionForm key={row?.id ?? "new"} action={saveBureauMember} successMessage={row ? "toast.saved" : "toast.created"} onSuccess={onClose} className="space-y-4" data-testid="bureau-form">
          {(pending) => (
            <>
              {row && <input type="hidden" name="id" value={row.id} />}
              <div className="space-y-1">
                <Upload name="photoUrl" kind="image" label={t("photo")} defaultValue={row?.photoUrl} />
                <p className="text-xs text-muted">{t("photoHint")}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="name" label={t("name")} defaultValue={row?.name} required maxLength={80} dir="auto" />
                <Input name="nameAr" label={t("nameAr")} defaultValue={row?.nameAr ?? ""} maxLength={80} dir="rtl" lang="ar" />
                <Input name="position" label={t("position")} placeholder={t("positionPh")} defaultValue={row?.position} required maxLength={80} dir="auto" />
                <Input name="positionAr" label={t("positionAr")} defaultValue={row?.positionAr ?? ""} maxLength={80} dir="rtl" lang="ar" />
              </div>
              <Checkbox name="isActive" label={t("active")} description={t("activeHint")} defaultChecked={row?.isActive ?? true} />
              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <Button variant="outline" onClick={onClose}>
                  {tc("actions.cancel")}
                </Button>
                <Button type="submit" loading={pending}>
                  {row ? tc("actions.save") : tc("actions.create")}
                </Button>
              </div>
            </>
          )}
        </ActionForm>
      )}
    </Modal>
  );
}

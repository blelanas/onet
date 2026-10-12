import { useTranslations } from "use-intl";
import { saveDance } from "@/api/content";
import { ActionForm } from "@/components/ui/action-form";
import { Button, LinkButton } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { Upload } from "@/components/ui/upload";
import { AGE_GROUPS, DANCE_CATEGORIES } from "@onet/shared";
import { isLocalFile } from "@/components/content/shared/media";
import { ContentFieldErrors, FieldErrorText, FormSection } from "@/components/content/shared/form-bits";

export type DanceFormValues = {
  id?: string;
  title?: string;
  description?: string | null;
  steps?: string | null;
  category?: string;
  ageGroup?: string;
  durationMin?: number | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
  videoUrl?: string | null;
  isPublic?: boolean;
};

export function DanceForm({ initial }: { initial: DanceFormValues }) {
  const t = useTranslations("content.dances");
  const tc = useTranslations("common");
  const tg = useTranslations("content.common");
  const uploadedVideo = isLocalFile(initial.videoUrl);
  return (
    <ActionForm action={saveDance} successMessage={initial.id ? "toast.saved" : "toast.created"} redirectTo={(d) => `/dashboard/content/dances/${d?.id}`} className="space-y-5">
      {(pending) => (
        <ContentFieldErrors>
          {initial.id && <input type="hidden" name="id" value={initial.id} />}
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <FormSection title={tg("general")}>
                <Input name="title" label={t("form.title")} defaultValue={initial.title} required maxLength={160} wrapperClassName="sm:col-span-2" dir="auto" />
                <Select name="category" label={t("category")} defaultValue={initial.category ?? "GROUP"} options={DANCE_CATEGORIES.map((c) => ({ value: c, label: tc(`enums.DANCE_CATEGORIES.${c}`) }))} required />
                <Select name="ageGroup" label={t("ageGroup")} defaultValue={initial.ageGroup ?? "ALL"} options={AGE_GROUPS.map((a) => ({ value: a, label: tc(`enums.ageGroup.${a}`) }))} required />
                <Input name="durationMin" type="number" min={1} max={600} label={t("form.durationMin")} defaultValue={initial.durationMin ?? ""} dir="ltr" />
                <Textarea name="description" label={t("form.description")} defaultValue={initial.description ?? ""} rows={3} wrapperClassName="sm:col-span-2" dir="auto" />
              </FormSection>
              <FormSection title={t("steps")} cols={1}>
                <Textarea name="steps" label={t("form.steps")} hint={t("form.stepsHint")} defaultValue={initial.steps ?? ""} rows={9} dir="auto" />
              </FormSection>
            </div>
            <div className="space-y-5">
              <FormSection title={tg("media")} cols={1}>
                <div className="space-y-1">
                  <Upload name="imageUrl" kind="image" label={t("form.image")} defaultValue={initial.imageUrl} />
                  <FieldErrorText name="imageUrl" />
                </div>
                <div className="space-y-1">
                  <Upload name="audioUrl" kind="audio" label={t("form.audio")} defaultValue={initial.audioUrl} />
                  <FieldErrorText name="audioUrl" />
                </div>
                <div className="space-y-1">
                  <Upload name="videoFile" kind="video" label={t("form.videoUpload")} defaultValue={uploadedVideo ? initial.videoUrl : ""} />
                  <FieldErrorText name="videoFile" />
                </div>
                <Input name="videoLink" type="url" inputMode="url" label={t("form.videoUrl")} placeholder="https://" defaultValue={uploadedVideo ? "" : (initial.videoUrl ?? "")} dir="ltr" />
              </FormSection>
              <FormSection title={tg("visibility")} cols={1}>
                <Checkbox name="isPublic" label={t("form.isPublic")} description={tg("publicHint")} defaultChecked={initial.isPublic ?? true} />
              </FormSection>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <LinkButton href={initial.id ? `/dashboard/content/dances/${initial.id}` : "/dashboard/content/dances"} variant="outline">
              {tc("actions.cancel")}
            </LinkButton>
            <Button type="submit" loading={pending}>
              {initial.id ? tc("actions.save") : tc("actions.create")}
            </Button>
          </div>
        </ContentFieldErrors>
      )}
    </ActionForm>
  );
}

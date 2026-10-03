import { useTranslations } from "use-intl";
import { saveGame } from "@/api/content";
import { ActionForm } from "@/components/ui/action-form";
import { Button, LinkButton } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { Upload } from "@/components/ui/upload";
import { AGE_GROUPS, GAME_CATEGORIES } from "@onet/shared";
import { isLocalFile } from "@/components/content/shared/media";
import { ContentFieldErrors, FieldErrorText, FormSection } from "@/components/content/shared/form-bits";

export type GameFormValues = {
  id?: string;
  name?: string;
  description?: string;
  rules?: string | null;
  instructions?: string | null;
  materials?: string | null;
  category?: string;
  ageGroup?: string;
  minPlayers?: number;
  maxPlayers?: number | null;
  durationMin?: number;
  imageUrl?: string | null;
  videoUrl?: string | null;
  isPublic?: boolean;
};

const isUpload = (u?: string | null) => isLocalFile(u);

export function GameForm({ initial }: { initial: GameFormValues }) {
  const t = useTranslations("content.games");
  const tc = useTranslations("common");
  const tg = useTranslations("content.common");
  return (
    <ActionForm action={saveGame} successMessage={initial.id ? "toast.saved" : "toast.created"} redirectTo={(d) => `/dashboard/content/games/${d?.id}`} className="space-y-5">
      {(pending) => (
        <ContentFieldErrors>
          {initial.id && <input type="hidden" name="id" value={initial.id} />}
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <FormSection title={tg("general")}>
                <Input name="name" label={t("form.name")} defaultValue={initial.name} required wrapperClassName="sm:col-span-2" dir="auto" />
                <Select name="category" label={t("category")} defaultValue={initial.category ?? "TEAM"} options={GAME_CATEGORIES.map((c) => ({ value: c, label: tc(`enums.gameCategory.${c}`) }))} required />
                <Select name="ageGroup" label={t("ageGroup")} defaultValue={initial.ageGroup ?? "ALL"} options={AGE_GROUPS.map((a) => ({ value: a, label: tc(`enums.ageGroup.${a}`) }))} required />
                <Input name="minPlayers" type="number" min={1} max={500} label={t("form.minPlayers")} defaultValue={initial.minPlayers ?? 2} dir="ltr" />
                <Input name="maxPlayers" type="number" min={1} max={500} label={t("form.maxPlayers")} defaultValue={initial.maxPlayers ?? ""} dir="ltr" />
                <Input name="durationMin" type="number" min={1} max={600} label={t("form.durationMin")} defaultValue={initial.durationMin ?? 15} dir="ltr" />
                <Textarea name="description" label={t("form.description")} defaultValue={initial.description} rows={3} required wrapperClassName="sm:col-span-2" dir="auto" />
              </FormSection>
              <FormSection title={t("rules")} cols={1}>
                <Textarea name="rules" label={t("form.rules")} hint={t("form.rulesHint")} defaultValue={initial.rules ?? ""} rows={7} dir="auto" />
                <Textarea name="instructions" label={t("form.instructions")} defaultValue={initial.instructions ?? ""} rows={4} dir="auto" />
                <Input name="materials" label={t("form.materials")} hint={t("form.materialsHint")} defaultValue={initial.materials ?? ""} dir="auto" />
              </FormSection>
            </div>
            <div className="space-y-5">
              <FormSection title={tg("media")} cols={1}>
                <div className="space-y-1">
                  <Upload name="imageUrl" kind="image" label={t("form.image")} defaultValue={initial.imageUrl} />
                  <FieldErrorText name="imageUrl" />
                </div>
                <div className="space-y-1">
                  <Upload name="videoFile" kind="video" label={t("form.videoUpload")} defaultValue={isUpload(initial.videoUrl) ? initial.videoUrl : ""} />
                  <FieldErrorText name="videoFile" />
                </div>
                <Input name="videoLink" type="url" inputMode="url" label={t("form.videoUrl")} placeholder="https://" defaultValue={isUpload(initial.videoUrl) ? "" : (initial.videoUrl ?? "")} dir="ltr" />
              </FormSection>
              <FormSection title={tg("visibility")} cols={1}>
                <Checkbox name="isPublic" label={t("form.isPublic")} description={tg("publicHint")} defaultChecked={initial.isPublic ?? true} />
              </FormSection>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <LinkButton href={initial.id ? `/dashboard/content/games/${initial.id}` : "/dashboard/content/games"} variant="outline">
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

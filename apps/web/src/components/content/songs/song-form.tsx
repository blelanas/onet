import { assetUrl } from "@/lib/api";
import { useTranslations } from "use-intl";
import { useState } from "react";
import { saveSong } from "@/api/content";
import { ActionForm } from "@/components/ui/action-form";
import { Button, LinkButton } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { Upload } from "@/components/ui/upload";
import { AGE_GROUPS, SONG_CATEGORIES } from "@onet/shared";
import { ContentFieldErrors, FieldErrorText, FormSection } from "@/components/content/shared/form-bits";

export type SongFormValues = {
  id?: string;
  title?: string;
  lyrics?: string;
  audioUrl?: string | null;
  coverUrl?: string | null;
  category?: string;
  ageGroup?: string;
  language?: string;
  author?: string | null;
  tags?: string | null;
  durationSec?: number | null;
  featured?: boolean;
  isPublic?: boolean;
};

export function SongForm({ initial }: { initial: SongFormValues }) {
  const t = useTranslations("content.songs");
  const tc = useTranslations("common");
  const tg = useTranslations("content.common");
  const [duration, setDuration] = useState(initial.durationSec != null ? String(initial.durationSec) : "");
  const [language, setLanguage] = useState(initial.language ?? "ar");
  const rtl = language === "ar";

  return (
    <ActionForm action={saveSong} successMessage={initial.id ? "toast.saved" : "toast.created"} redirectTo={(d) => `/dashboard/content/songs/${d?.id}`} className="space-y-5">
      {(pending) => (
        <ContentFieldErrors>
          {initial.id && <input type="hidden" name="id" value={initial.id} />}
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <FormSection title={tg("general")}>
                <Input name="title" label={t("form.title")} defaultValue={initial.title} required wrapperClassName="sm:col-span-2" dir="auto" />
                <Select name="category" label={t("category")} defaultValue={initial.category ?? "CHILDREN"} options={SONG_CATEGORIES.map((c) => ({ value: c, label: tc(`enums.songCategory.${c}`) }))} required />
                <Select name="ageGroup" label={t("ageGroup")} defaultValue={initial.ageGroup ?? "ALL"} options={AGE_GROUPS.map((a) => ({ value: a, label: tc(`enums.ageGroup.${a}`) }))} required />
                <Select name="language" label={t("language")} value={language} onChange={(e) => setLanguage(e.target.value)} options={(["ar", "fr", "en"] as const).map((l) => ({ value: l, label: t(`languages.${l}`) }))} required />
                <Input name="author" label={t("author")} defaultValue={initial.author ?? ""} dir="auto" />
                <Input name="tags" label={t("form.tags")} hint={t("form.tagsHint")} defaultValue={initial.tags ?? ""} wrapperClassName="sm:col-span-2" dir="auto" />
              </FormSection>
              <FormSection title={t("form.lyrics")} cols={1}>
                <Textarea
                  name="lyrics"
                  label={t("form.lyrics")}
                  hint={t("form.lyricsHint")}
                  defaultValue={initial.lyrics}
                  rows={14}
                  required
                  dir={rtl ? "rtl" : "ltr"}
                  lang={language}
                  className={rtl ? "font-[family-name:var(--font-arabic)] text-base leading-loose" : "text-base leading-relaxed"}
                />
              </FormSection>
            </div>
            <div className="space-y-5">
              <FormSection title={tg("media")} cols={1}>
                <div className="space-y-1">
                  <Upload
                    name="audioUrl"
                    kind="audio"
                    label={t("form.audio")}
                    defaultValue={initial.audioUrl}
                    onUploaded={(f) => {
                      const a = new Audio();
                      a.preload = "metadata";
                      a.onloadedmetadata = () => Number.isFinite(a.duration) && setDuration(String(Math.round(a.duration)));
                      a.src = assetUrl(f.url) ?? "";
                    }}
                  />
                  <FieldErrorText name="audioUrl" />
                </div>
                <Input name="durationSec" type="number" min={0} max={36000} label={t("form.duration")} hint={t("form.durationHint")} value={duration} onChange={(e) => setDuration(e.target.value)} dir="ltr" />
                <div className="space-y-1">
                  <Upload name="coverUrl" kind="image" label={t("form.cover")} defaultValue={initial.coverUrl} />
                  <p className="text-xs text-muted">{t("form.coverHint")}</p>
                  <FieldErrorText name="coverUrl" />
                </div>
              </FormSection>
              <FormSection title={tg("visibility")} cols={1}>
                <Checkbox name="featured" label={t("form.featured")} description={t("form.featuredHint")} defaultChecked={initial.featured ?? false} />
                <Checkbox name="isPublic" label={t("form.isPublic")} description={tg("publicHint")} defaultChecked={initial.isPublic ?? true} />
              </FormSection>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <LinkButton href={initial.id ? `/dashboard/content/songs/${initial.id}` : "/dashboard/content/songs"} variant="outline">
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

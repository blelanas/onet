"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { saveConference } from "@/server/content/conference-actions";
import { ActionForm } from "@/components/ui/action-form";
import { Button, LinkButton } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { Upload } from "@/components/ui/upload";
import { CONFERENCE_CATEGORIES } from "@/lib/constants";
import { toDateTimeInput } from "@/lib/dates";
import { ContentFieldErrors, FieldErrorText, FormSection } from "@/components/content/shared/form-bits";

export type ConferenceFormValues = {
  id?: string;
  title?: string;
  speaker?: string;
  speakerBio?: string | null;
  description?: string | null;
  category?: string;
  date?: Date | string;
  location?: string | null;
  coverUrl?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  isPublic?: boolean;
};

const isUpload = (u?: string | null) => !!u && /^\/(uploads|demo)\//.test(u);

export function ConferenceForm({ initial }: { initial: ConferenceFormValues }) {
  const t = useTranslations("content.conferences");
  const tc = useTranslations("common");
  const tg = useTranslations("content.common");
  const [mediaType, setMediaType] = useState(initial.mediaType ?? "");
  const media = initial.mediaUrl;
  return (
    <ActionForm action={saveConference} successMessage={initial.id ? "toast.saved" : "toast.created"} redirectTo={(d) => `/dashboard/content/conferences/${d?.id}`} className="space-y-5">
      {(pending) => (
        <ContentFieldErrors>
          {initial.id && <input type="hidden" name="id" value={initial.id} />}
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <FormSection title={tg("general")}>
                <Input name="title" label={t("form.title")} defaultValue={initial.title} required wrapperClassName="sm:col-span-2" dir="auto" />
                <Select name="category" label={tc("fields.category")} defaultValue={initial.category ?? "EDUCATION"} options={CONFERENCE_CATEGORIES.map((c) => ({ value: c, label: tc(`enums.conferenceCategory.${c}`) }))} required />
                <Input name="date" type="datetime-local" label={t("form.date")} defaultValue={toDateTimeInput(initial.date)} required dir="ltr" />
                <Input name="location" label={t("form.location")} defaultValue={initial.location ?? ""} wrapperClassName="sm:col-span-2" dir="auto" />
                <Textarea name="description" label={t("form.description")} hint={t("form.descriptionHint")} defaultValue={initial.description ?? ""} rows={6} wrapperClassName="sm:col-span-2" dir="auto" />
              </FormSection>
              <FormSection title={t("speaker")}>
                <Input name="speaker" label={t("form.speaker")} defaultValue={initial.speaker} required dir="auto" />
                <Input name="speakerBio" label={t("form.speakerBio")} defaultValue={initial.speakerBio ?? ""} dir="auto" />
              </FormSection>
            </div>
            <div className="space-y-5">
              <FormSection title={tg("media")} cols={1}>
                <div className="space-y-1">
                  <Upload name="coverUrl" kind="image" label={t("form.cover")} defaultValue={initial.coverUrl} />
                  <FieldErrorText name="coverUrl" />
                </div>
                <Select
                  name="mediaType"
                  label={t("form.mediaType")}
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value)}
                  options={[{ value: "", label: t("form.noMedia") }, { value: "AUDIO", label: t("form.mediaTypes.AUDIO") }, { value: "VIDEO", label: t("form.mediaTypes.VIDEO") }]}
                />
                {mediaType === "AUDIO" && <Upload name="audioFile" kind="audio" label={t("form.media")} defaultValue={initial.mediaType === "AUDIO" ? media : ""} />}
                {mediaType === "VIDEO" && (
                  <>
                    <Upload name="videoFile" kind="video" label={t("form.media")} defaultValue={initial.mediaType === "VIDEO" && isUpload(media) ? media : ""} />
                    <Input name="videoLink" type="url" inputMode="url" label={t("form.videoLink")} placeholder="https://" defaultValue={initial.mediaType === "VIDEO" && !isUpload(media) ? (media ?? "") : ""} dir="ltr" />
                  </>
                )}
                <FieldErrorText name="mediaUrl" />
              </FormSection>
              <FormSection title={tg("visibility")} cols={1}>
                <Checkbox name="isPublic" label={t("form.isPublic")} description={tg("publicHint")} defaultChecked={initial.isPublic ?? true} />
              </FormSection>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <LinkButton href={initial.id ? `/dashboard/content/conferences/${initial.id}` : "/dashboard/content/conferences"} variant="outline">
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

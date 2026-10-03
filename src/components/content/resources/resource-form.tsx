"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Edit, Plus } from "lucide-react";
import { saveResource } from "@/server/content/resource-actions";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Upload } from "@/components/ui/upload";
import { RESOURCE_TYPES } from "@/lib/constants";
import { ContentFieldErrors, FieldErrorText } from "@/components/content/shared/form-bits";

export type ResourceFormValues = { id?: string; title?: string; description?: string | null; type?: string; url?: string; category?: string | null; audience?: string; sizeBytes?: number | null };

const AUDIENCES = ["ALL", "PARENTS", "MONITORS", "KIDS"] as const;
const UPLOAD_KIND: Record<string, "document" | "image" | "video"> = { PDF: "document", DOCUMENT: "document", IMAGE: "image", VIDEO: "video" };
const isUpload = (u?: string | null) => !!u && /^\/(uploads|demo)\//.test(u);

/** "New resource" / "Edit" button opening the form in a modal (bottom sheet on phones). */
export function ResourceFormButton({ initial, categories, variant = "new" }: { initial?: ResourceFormValues; categories: string[]; variant?: "new" | "edit" }) {
  const t = useTranslations("content.resources");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [type, setType] = useState(initial?.type ?? "PDF");
  const [size, setSize] = useState(initial?.sizeBytes != null ? String(initial.sizeBytes) : "");
  const formId = `resource-form-${initial?.id ?? "new"}`;
  const fileDefault = isUpload(initial?.url) && initial?.type === type ? initial?.url : "";
  const linkDefault = !isUpload(initial?.url) ? (initial?.url ?? "") : "";

  return (
    <>
      {variant === "new" ? (
        <Button onClick={() => setOpen(true)} className="h-11 rounded-full bg-white text-ink shadow-lg hover:bg-white/90">
          <Plus className="size-4" /> {t("new")}
        </Button>
      ) : (
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} aria-label={tc("actions.edit")}>
          <Edit className="size-4" />
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={initial?.id ? t("editTitle") : t("new")}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" form={formId}>
              {initial?.id ? tc("actions.save") : tc("actions.create")}
            </Button>
          </>
        }
      >
        <ActionForm
          key={formKey}
          id={formId}
          action={saveResource}
          successMessage={initial?.id ? "toast.saved" : "toast.created"}
          onSuccess={() => {
            setOpen(false);
            if (!initial?.id) {
              // Start the next "new resource" from a blank form.
              setType("PDF");
              setSize("");
              setFormKey((k) => k + 1);
            }
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <ContentFieldErrors>
            {initial?.id && <input type="hidden" name="id" value={initial.id} />}
            <input type="hidden" name="sizeBytes" value={size} />
            <Input name="title" label={t("form.title")} defaultValue={initial?.title} required wrapperClassName="sm:col-span-2" dir="auto" />
            <Select name="type" label={t("form.type")} value={type} onChange={(e) => setType(e.target.value)} options={RESOURCE_TYPES.map((v) => ({ value: v, label: tc(`enums.resourceType.${v}`) }))} required />
            <Select name="audience" label={t("form.audience")} defaultValue={initial?.audience ?? "ALL"} options={AUDIENCES.map((a) => ({ value: a, label: tc(`enums.audience.${a}`) }))} required />
            <Input name="category" label={t("form.category")} hint={t("form.categoryHint")} defaultValue={initial?.category ?? ""} list="resource-categories" wrapperClassName="sm:col-span-2" dir="auto" />
            <datalist id="resource-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {type !== "LINK" && (
              <div className="space-y-1 sm:col-span-2" key={type}>
                <Upload name="fileUrl" kind={UPLOAD_KIND[type]} label={t("form.file")} defaultValue={fileDefault} onUploaded={(f) => setSize(String(f.sizeBytes))} />
                <FieldErrorText name="fileUrl" />
              </div>
            )}
            {(type === "LINK" || type === "VIDEO" || !!linkDefault) && (
              <Input name="linkUrl" type="url" inputMode="url" label={type === "LINK" ? t("form.url") : type === "VIDEO" ? t("form.videoUrl") : t("form.url")} placeholder="https://" defaultValue={linkDefault} required={type === "LINK"} wrapperClassName="sm:col-span-2" dir="ltr" />
            )}
            <Textarea name="description" label={t("form.description")} defaultValue={initial?.description ?? ""} rows={3} wrapperClassName="sm:col-span-2" dir="auto" />
          </ContentFieldErrors>
        </ActionForm>
      </Modal>
    </>
  );
}

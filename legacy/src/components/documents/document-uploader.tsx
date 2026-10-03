"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { addDocument } from "@/server/documents/actions";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Upload, type UploadedFile } from "@/components/ui/upload";
import { DOCUMENT_CATEGORIES } from "@/lib/constants";

export function DocumentUploader({ entityType, entityId, revalidate, onDone }: { entityType: string; entityId?: string; revalidate?: string; onDone?: () => void }) {
  const t = useTranslations("documents");
  const tc = useTranslations("common");
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [key, setKey] = useState(0);
  return (
    <ActionForm
      key={key}
      action={addDocument}
      successMessage="toast.created"
      onSuccess={() => {
        setFile(null);
        setKey((k) => k + 1);
        onDone?.();
      }}
      className="rounded-2xl border border-line bg-surface-2/40 p-4"
    >
      {(pending) => (
        <div className="space-y-3">
          <Upload name="url" kind="document" onUploaded={setFile} />
          {file && (
            <div className="grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end">
              <input type="hidden" name="mimeType" value={file.mimeType} />
              <input type="hidden" name="sizeBytes" value={file.sizeBytes} />
              <input type="hidden" name="entityType" value={entityType} />
              {entityId && <input type="hidden" name="entityId" value={entityId} />}
              {revalidate && <input type="hidden" name="revalidate" value={revalidate} />}
              <Input name="name" label={t("fields.name")} defaultValue={file.originalName} required />
              <Select name="category" label={tc("fields.category")} defaultValue="OTHER" options={DOCUMENT_CATEGORIES.map((c) => ({ value: c, label: tc(`enums.documentCategory.${c}`) }))} />
              <Button type="submit" loading={pending}>
                {tc("actions.save")}
              </Button>
            </div>
          )}
        </div>
      )}
    </ActionForm>
  );
}

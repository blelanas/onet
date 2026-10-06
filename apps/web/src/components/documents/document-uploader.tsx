import { useTranslations } from "use-intl";
import { useEffect, useRef, useState } from "react";
import { addDocument, discardUpload } from "@/api/documents";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Upload, type UploadedFile } from "@/components/ui/upload";
import { DOCUMENT_CATEGORIES } from "@onet/shared";

export function DocumentUploader({ entityType, entityId, revalidate, onDone }: { entityType: string; entityId?: string; revalidate?: string; onDone?: () => void }) {
  const t = useTranslations("documents");
  const tc = useTranslations("common");
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [key, setKey] = useState(0);
  // Uploaded but not yet saved as a document: discarded when replaced or when the uploader closes.
  const unsaved = useRef<string | null>(null);
  // Mirrors ActionForm's pending state: while addDocument is in flight the upload must not be discarded.
  const saving = useRef(false);
  const closed = useRef(false);
  useEffect(() => {
    closed.current = false;
    return () => {
      closed.current = true;
      if (unsaved.current && !saving.current) void discardUpload(unsaved.current);
    };
  }, []);
  const save = async (fd: FormData) => {
    saving.current = true;
    try {
      const res = await addDocument(fd);
      if (res.ok) unsaved.current = null;
      return res;
    } finally {
      saving.current = false;
      // Closed while saving and the save didn't go through: discard now.
      if (closed.current && unsaved.current) {
        void discardUpload(unsaved.current);
        unsaved.current = null;
      }
    }
  };
  const onUploaded = (f: UploadedFile) => {
    if (unsaved.current && unsaved.current !== f.url) void discardUpload(unsaved.current);
    unsaved.current = f.url;
    setFile(f);
  };
  return (
    <ActionForm
      key={key}
      action={save}
      successMessage="toast.created"
      onSuccess={() => {
        unsaved.current = null;
        setFile(null);
        setKey((k) => k + 1);
        onDone?.();
      }}
      className="rounded-2xl border border-line bg-surface-2/40 p-4"
    >
      {(pending) => (
        <div className="space-y-3">
          <Upload name="url" kind="document" onUploaded={onUploaded} />
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

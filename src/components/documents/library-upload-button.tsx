"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { DocumentUploader } from "./document-uploader";

/** Opens the uploader for GENERAL documents (documents.manage — re-checked by addDocument). */
export function LibraryUploadButton() {
  const t = useTranslations("documents.library");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UploadCloud className="size-4" /> {t("upload")}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("uploadTitle")} description={t("uploadHint")} size="lg">
        <DocumentUploader entityType="GENERAL" revalidate="/dashboard/documents" onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

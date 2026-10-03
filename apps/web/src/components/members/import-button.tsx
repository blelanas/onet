import { useTranslations } from "use-intl";
import { useState } from "react";
import { Upload as UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { importMembers } from "@/api/members";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const TEMPLATE = "type,firstName,lastName,dateOfBirth,gender,phone,email,address,membershipStatus\nCHILD,Lina,Sassi,2018-04-12,F,,,Teboulba,ACTIVE\n";

export function ImportMembersButton() {
  const t = useTranslations("people.import");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <UploadIcon className="size-4" /> <span className="hidden sm:inline">{tc("actions.import")}</span>
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("title")} description={t("help")}>
        <ActionForm
          action={importMembers}
          onSuccess={(d) => {
            setOpen(false);
            if (d) toast.info(t("result", { created: d.created, errors: d.errorLines.length ? d.errorLines.join(", ") : "0" }));
          }}
          className="space-y-4"
        >
          {(pending) => (
            <>
              <input type="file" name="file" accept=".csv,text/csv" required className="block w-full rounded-xl border border-line bg-surface-2/50 p-3 text-sm file:me-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:font-bold file:text-white" />
              <div className="flex items-center justify-between gap-2">
                <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`} download="modele-membres.csv" className="text-sm font-bold text-brand-600 hover:underline">
                  {t("template")}
                </a>
                <Button type="submit" loading={pending}>
                  {tc("actions.import")}
                </Button>
              </div>
            </>
          )}
        </ActionForm>
      </Modal>
    </>
  );
}

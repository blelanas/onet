import { useTranslations } from "use-intl";
import { useState } from "react";
import { MailCheck, Send } from "lucide-react";
import { submitContactMessage } from "@/api/public";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Honeypot, SuccessCard } from "./form-bits";

export function ContactForm() {
  const t = useTranslations("public.contact");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <SuccessCard
        title={t("successTitle")}
        text={t("successText")}
        icon={<MailCheck className="size-9" />}
        actions={
          <Button variant="outline" size="lg" className="h-auto min-h-12 rounded-full py-2.5 whitespace-normal" onClick={() => setDone(false)}>
            {t("another")}
          </Button>
        }
      />
    );
  }

  return (
    <ActionForm method="post" action={submitContactMessage} successMessage={t("sent")} onSuccess={() => setDone(true)} className="relative space-y-4">
      {(pending) => (
        <>
          <Honeypot />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input name="name" label={t("name")} autoComplete="name" required maxLength={120} />
            <Input name="email" type="email" label={t("emailField")} autoComplete="email" required dir="ltr" className="text-start" maxLength={160} />
          </div>
          <Input name="subject" label={t("subject")} placeholder={t("subjectPh")} maxLength={160} />
          <Textarea name="body" label={t("message")} hint={t("messageHint")} required rows={6} minLength={10} maxLength={4000} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted">{t("privacy")}</p>
            <Button type="submit" size="lg" loading={pending} className="h-12 rounded-full px-8">
              <Send className="rtl-flip size-4" /> {t("send")}
            </Button>
          </div>
        </>
      )}
    </ActionForm>
  );
}

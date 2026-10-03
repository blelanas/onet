import { useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { useRef, useState } from "react";
import { ArrowRight, Baby, Mail, PartyPopper, Phone, Send, UserRound } from "lucide-react";
import { submitJoinRequest } from "@/api/public";
import { ActionForm } from "@/components/ui/action-form";
import { Button, buttonClasses } from "@/components/ui/button";
import { Checkbox, Input, Textarea } from "@/components/ui/input";
import { useFieldError } from "@/components/ui/form-context";
import { useErrorText } from "@/components/ui/input";
import { toDateInput } from "@onet/shared";
import { Honeypot, SuccessCard } from "./form-bits";

export function JoinForm() {
  const t = useTranslations("public.join");
  const [done, setDone] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const today = toDateInput(new Date());

  if (done) {
    return (
      <SuccessCard
        title={t("successTitle")}
        text={t("successText")}
        icon={<PartyPopper className="size-9" />}
        actions={
          <>
            <Link href="/activities" className={buttonClasses("primary", "lg", "h-auto min-h-12 rounded-full py-2.5 whitespace-normal")}>
              {t("successNext")} <ArrowRight className="rtl-flip size-4" />
            </Link>
            <Button variant="outline" size="lg" className="h-auto min-h-12 rounded-full py-2.5 whitespace-normal" onClick={() => setDone(false)}>
              {t("another")}
            </Button>
          </>
        }
      />
    );
  }

  return (
    <div ref={topRef} className="scroll-mt-24">
      <ActionForm
        method="post"
        action={submitJoinRequest}
        successMessage={t("sent")}
        onSuccess={() => {
          setDone(true);
          topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        className="relative space-y-6"
      >
        {(pending) => (
          <>
            <Honeypot />
            <fieldset className="space-y-4">
              <legend className="mb-3 flex items-center gap-2 text-lg font-extrabold text-ink">
                <span className="grid size-8 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <UserRound className="size-4" />
                </span>
                {t("parentSection")}
              </legend>
              <Input name="parentName" label={t("parentName")} autoComplete="name" required maxLength={120} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="email" type="email" label={t("email")} autoComplete="email" required icon={<Mail className="size-4" />} dir="ltr" className="text-start" maxLength={160} />
                <Input name="phone" type="tel" label={t("phone")} autoComplete="tel" required icon={<Phone className="size-4" />} hint={t("phoneHint")} dir="ltr" className="text-start" placeholder="+216 …" maxLength={30} />
              </div>
            </fieldset>
            <fieldset className="space-y-4">
              <legend className="mb-3 flex items-center gap-2 text-lg font-extrabold text-ink">
                <span className="grid size-8 place-items-center rounded-xl bg-sun-soft text-amber-600">
                  <Baby className="size-4" />
                </span>
                {t("childSection")}
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="childName" label={t("childName")} maxLength={120} />
                <Input name="childDob" type="date" label={t("childDob")} max={today} />
              </div>
              <Textarea name="message" label={t("message")} placeholder={t("messagePh")} rows={4} maxLength={2000} />
            </fieldset>
            <Consent label={t("consent")} />
            <Button type="submit" size="lg" loading={pending} className="h-14 w-full rounded-full text-lg sm:w-auto sm:px-10">
              <Send className="rtl-flip size-5" /> {t("submit")}
            </Button>
          </>
        )}
      </ActionForm>
    </div>
  );
}

function Consent({ label }: { label: string }) {
  const err = useErrorText(useFieldError("consent"));
  return (
    <div className="rounded-2xl bg-surface-2 p-3">
      <Checkbox name="consent" label={label} required aria-invalid={!!err || undefined} />
      {err && (
        <p className="ms-9 text-xs font-semibold text-red-600" role="alert">
          {err}
        </p>
      )}
    </div>
  );
}

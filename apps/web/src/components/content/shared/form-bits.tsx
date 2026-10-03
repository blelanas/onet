import { useTranslations } from "use-intl";
import { useContext } from "react";
import { FieldErrorsContext } from "@/components/ui/form-context";

/** Translates module-specific field error keys ("content.*") before the shared inputs display them. */
export function ContentFieldErrors({ children }: { children: React.ReactNode }) {
  const errors = useContext(FieldErrorsContext);
  const t = useTranslations();
  const mapped = Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, v.startsWith("content.") ? t(v) : v]));
  return <FieldErrorsContext.Provider value={mapped}>{children}</FieldErrorsContext.Provider>;
}

export function FormSection({ title, children, cols = 2 }: { title: string; children: React.ReactNode; cols?: 1 | 2 }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-bold text-ink">{title}</h2>
      <div className={cols === 2 ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>{children}</div>
    </section>
  );
}

/** Field error text for fields that are not rendered through <Input/> (e.g. uploads). */
export function FieldErrorText({ name }: { name: string }) {
  const errors = useContext(FieldErrorsContext);
  const tc = useTranslations("common");
  const t = useTranslations();
  const e = errors[name];
  if (!e) return null;
  return (
    <p className="text-xs font-semibold text-red-600" role="alert">
      {e.startsWith("errors.") ? tc(e) : e.startsWith("content.") ? t(e) : e}
    </p>
  );
}

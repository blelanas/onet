import { useTranslations } from "use-intl";
import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";
import { useFieldError } from "./form-context";

export const inputClasses =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 shadow-[inset_0_1px_2px_rgb(34_27_51/0.04)] transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 focus:outline-none disabled:opacity-60 aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-100";

export function useErrorText(error?: string) {
  const t = useTranslations("common");
  if (!error) return undefined;
  return error.startsWith("errors.") ? t(error) : error;
}

type FieldProps = {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  name?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (id: string, invalid: boolean) => React.ReactNode;
};

export function Field({ label, hint, name, error, required, className, children }: FieldProps) {
  const id = useId();
  const ctxError = useFieldError(name);
  const message = useErrorText(error ?? ctxError);
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-bold text-ink-2">
          {label}
          {required && <span className="ms-0.5 text-brand-600">*</span>}
        </label>
      )}
      {children(id, !!message)}
      {message ? (
        <p className="text-xs font-semibold text-red-600" role="alert">
          {message}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label?: React.ReactNode; hint?: React.ReactNode; error?: string; icon?: React.ReactNode; wrapperClassName?: string };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, hint, error, icon, className, wrapperClassName, ...props }, ref) {
  return (
    <Field label={label} hint={hint} name={props.name} error={error} required={props.required} className={wrapperClassName}>
      {(id, invalid) => (
        <div className="relative">
          {icon && <span className="pointer-events-none absolute inset-y-0 start-3 grid place-items-center text-muted">{icon}</span>}
          <input ref={ref} id={id} aria-invalid={invalid || undefined} className={cn(inputClasses, icon && "ps-10", className)} {...props} />
        </div>
      )}
    </Field>
  );
});

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: React.ReactNode; hint?: React.ReactNode; error?: string; wrapperClassName?: string };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ label, hint, error, className, wrapperClassName, rows = 4, ...props }, ref) {
  return (
    <Field label={label} hint={hint} name={props.name} error={error} required={props.required} className={wrapperClassName}>
      {(id, invalid) => <textarea ref={ref} id={id} rows={rows} aria-invalid={invalid || undefined} className={cn(inputClasses, "resize-y", className)} {...props} />}
    </Field>
  );
});

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  wrapperClassName?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, hint, error, options, placeholder, className, wrapperClassName, ...props }, ref) {
  return (
    <Field label={label} hint={hint} name={props.name} error={error} required={props.required} className={wrapperClassName}>
      {(id, invalid) => (
        <select ref={ref} id={id} aria-invalid={invalid || undefined} className={cn(inputClasses, "appearance-none bg-[length:16px] bg-[position:right_0.75rem_center] bg-no-repeat pe-9 rtl:bg-[position:left_0.75rem_center]", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%237a7390' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...props}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
});

export function Checkbox({ label, description, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; description?: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl p-1", className)}>
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 cursor-pointer rounded-md border-line accent-brand-600" {...props} />
      <span>
        <span className="block text-sm font-bold text-ink">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
    </label>
  );
}

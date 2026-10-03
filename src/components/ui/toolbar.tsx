"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputClasses } from "./input";

function useQueryUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const set = (patch: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) (v ? sp.set(k, v) : sp.delete(k));
    sp.delete("page");
    const qs = sp.toString();
    start(() => router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false }));
  };
  return { params, set, pending };
}

/** Debounced URL-bound search box (?q=). */
export function SearchBox({ placeholder, param = "q", className }: { placeholder?: string; param?: string; className?: string }) {
  const t = useTranslations("common");
  const { params, set, pending } = useQueryUpdater();
  const [value, setValue] = useState(params.get(param) ?? "");
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => set({ [param]: value.trim() || null }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className={cn("relative min-w-0 flex-1 sm:max-w-xs", className)}>
      <span className="pointer-events-none absolute inset-y-0 start-3 grid place-items-center text-muted">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder ?? t("actions.search")}
        aria-label={placeholder ?? t("actions.search")}
        className={cn(inputClasses, "ps-10 pe-9")}
      />
      {value && (
        <button type="button" onClick={() => setValue("")} className="absolute inset-y-0 end-2 grid place-items-center px-1 text-muted hover:text-ink" aria-label={t("actions.clear")}>
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

/** URL-bound select filter. */
export function FilterSelect({ param, options, allLabel, label, className }: { param: string; options: { value: string; label: string }[]; allLabel: string; label?: string; className?: string }) {
  const { params, set } = useQueryUpdater();
  return (
    <select
      aria-label={label ?? allLabel}
      value={params.get(param) ?? ""}
      onChange={(e) => set({ [param]: e.target.value || null })}
      className={cn(inputClasses, "w-auto min-w-36 cursor-pointer py-2 pe-8", className)}
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Pill-style single-choice filter (great on mobile, used for categories). */
export function FilterChips({ param, options, allLabel, className }: { param: string; options: { value: string; label: string; color?: string }[]; allLabel: string; className?: string }) {
  const { params, set } = useQueryUpdater();
  const current = params.get(param) ?? "";
  const chip = (active: boolean) =>
    cn("shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold transition border", active ? "border-transparent bg-ink text-white shadow-sm" : "border-line bg-surface text-ink-2 hover:border-brand-200 hover:text-brand-700");
  return (
    <div className={cn("scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1", className)} role="radiogroup">
      <button type="button" role="radio" aria-checked={!current} className={chip(!current)} onClick={() => set({ [param]: null })}>
        {allLabel}
      </button>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={current === o.value}
          className={chip(current === o.value)}
          style={current === o.value && o.color ? { background: o.color } : undefined}
          onClick={() => set({ [param]: current === o.value ? null : o.value })}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center", className)}>{children}</div>;
}

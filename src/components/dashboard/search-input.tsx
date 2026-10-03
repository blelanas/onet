"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Big, mobile-friendly search field bound to ?q= (debounced, works without JS as a GET form). */
export function SearchInput({ defaultValue }: { defaultValue: string }) {
  const t = useTranslations("search");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLInputElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => {
      const sp = new URLSearchParams(params.toString());
      if (value.trim()) sp.set("q", value.trim());
      else sp.delete("q");
      start(() => router.replace(`${pathname}?${sp.toString()}`, { scroll: false }));
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <form role="search" action="/dashboard/search" className="relative" onSubmit={(e) => e.preventDefault()}>
      <span className="pointer-events-none absolute inset-y-0 start-4 grid place-items-center text-muted">{pending ? <Loader2 className="size-5 animate-spin" /> : <Search className="size-5" />}</span>
      <input
        ref={ref}
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("placeholder")}
        aria-label={t("placeholder")}
        autoFocus={!defaultValue}
        enterKeyHint="search"
        className={cn("h-14 w-full rounded-2xl border border-line bg-surface ps-12 pe-12 text-base text-ink shadow-[var(--shadow-soft)] placeholder:text-muted/70 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 focus:outline-none sm:text-lg [&::-webkit-search-cancel-button]:hidden")}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            ref.current?.focus();
          }}
          className="absolute inset-y-0 end-3 my-auto grid size-9 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink"
          aria-label={tc("actions.clear")}
        >
          <X className="size-5" />
        </button>
      )}
    </form>
  );
}

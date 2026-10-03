import { Link } from "@/lib/router";
import { cn } from "@/lib/utils";

/** Link-based tabs (state in the URL, works without JS). */
export function LinkTabs({ tabs, active, className }: { tabs: { key: string; label: React.ReactNode; href: string; count?: number }[]; active: string; className?: string }) {
  return (
    <div className={cn("scrollbar-none -mx-1 mb-5 flex gap-1 overflow-x-auto border-b border-line px-1", className)} role="tablist">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          role="tab"
          aria-selected={t.key === active}
          scroll={false}
          className={cn(
            "relative flex shrink-0 items-center gap-2 px-3 pt-2 pb-3 text-sm font-bold transition-colors",
            t.key === active ? "text-brand-700" : "text-muted hover:text-ink",
          )}
        >
          {t.label}
          {typeof t.count === "number" && (
            <span className={cn("rounded-full px-1.5 text-[11px]", t.key === active ? "bg-brand-100 text-brand-700" : "bg-surface-2 text-muted")}>{t.count}</span>
          )}
          {t.key === active && <span className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-brand-600" />}
        </Link>
      ))}
    </div>
  );
}

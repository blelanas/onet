import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { RotateCcw } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SP = Record<string, string | string[] | undefined>;
export const one = (v: string | string[] | undefined) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

/** Container for list pages under the hero. */
export function PageBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export async function ResultsCount({ count }: { count: number }) {
  const t = await getTranslations("public.common");
  return (
    <p className="mb-4 text-sm font-bold text-muted" aria-live="polite">
      {t("results", { count })}
    </p>
  );
}

export async function EmptyResults({ resetHref, filtered, description }: { resetHref: string; filtered: boolean; description?: string }) {
  const t = await getTranslations("public.common");
  return (
    <div className="card">
      <EmptyState
        title={t("emptyTitle")}
        description={filtered ? t("emptyFiltered") : description}
        action={
          filtered ? (
            <Link href={resetHref} className={buttonClasses("outline", "md", "rounded-full")}>
              <RotateCcw className="size-4" /> {t("resetFilters")}
            </Link>
          ) : undefined
        }
      />
    </div>
  );
}

/** Upcoming / past link tabs (pill style). */
export function WhenTabs({ base, when, labels, params }: { base: string; when: "upcoming" | "past"; labels: { upcoming: string; past: string }; params: SP }) {
  const href = (w: "upcoming" | "past") => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (typeof v === "string" && v && k !== "when" && k !== "page") sp.set(k, v);
    if (w === "past") sp.set("when", "past");
    const qs = sp.toString();
    return `${base}${qs ? `?${qs}` : ""}`;
  };
  return (
    <div className="inline-flex rounded-full bg-surface p-1 shadow-[var(--shadow-soft)] ring-1 ring-line" role="tablist">
      {(["upcoming", "past"] as const).map((w) => (
        <Link
          key={w}
          href={href(w)}
          role="tab"
          aria-selected={when === w}
          scroll={false}
          className={cn("rounded-full px-4 py-1.5 text-sm font-extrabold transition", when === w ? "bg-ink text-white" : "text-ink-2 hover:text-ink")}
        >
          {labels[w]}
        </Link>
      ))}
    </div>
  );
}

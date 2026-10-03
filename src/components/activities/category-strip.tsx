import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ACTIVITY_CATEGORIES, CATEGORY_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ACTIVITY_ICONS } from "./category-icon";

/** Colorful category tiles (counts) that double as a category filter. */
export async function CategoryStrip({ counts, active, sp }: { counts: Record<string, number>; active?: string; sp: Record<string, string | string[] | undefined> }) {
  const tc = await getTranslations("common");
  const href = (c: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && k !== "category" && k !== "page") q.set(k, v);
    if (active !== c) q.set("category", c);
    const s = q.toString();
    return `/dashboard/activities${s ? `?${s}` : ""}`;
  };
  return (
    <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-9">
      {ACTIVITY_CATEGORIES.map((c, i) => {
        const I = ACTIVITY_ICONS[c];
        const color = CATEGORY_COLORS[c];
        const on = active === c;
        return (
          <Link
            key={c}
            href={href(c)}
            scroll={false}
            aria-current={on ? "true" : undefined}
            className={cn("group relative flex w-32 shrink-0 animate-[var(--animate-pop)] flex-col overflow-hidden rounded-2xl p-3 text-white transition hover:-translate-y-0.5 sm:w-auto", on ? "ring-4 ring-offset-2 ring-offset-canvas" : active ? "opacity-60 hover:opacity-100" : "")}
            style={{ background: `linear-gradient(140deg, ${color}, ${color}CC)`, animationDelay: `${i * 30}ms`, ["--tw-ring-color" as string]: `${color}66` }}
          >
            <svg className="pointer-events-none absolute -end-5 -top-5 size-16 text-white/20 transition-transform duration-500 group-hover:scale-125" viewBox="0 0 100 100" aria-hidden>
              <circle cx="50" cy="50" r="50" fill="currentColor" />
            </svg>
            <I className="size-6" aria-hidden />
            <span className="mt-3 truncate text-sm font-extrabold">{tc(`enums.activityCategory.${c}`)}</span>
            <span className="text-xs font-bold text-white/80 tabular-nums">{counts[c] ?? 0}</span>
          </Link>
        );
      })}
    </div>
  );
}

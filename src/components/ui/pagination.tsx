import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

/** Server-rendered, URL-driven pagination (keeps the other search params). */
export async function Pagination({
  page,
  pageSize,
  total,
  basePath,
  searchParams,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const t = await getTranslations("common");
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (typeof v === "string" && v && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);

  const btn = "grid h-9 min-w-9 place-items-center rounded-xl px-2 text-sm font-bold transition";
  return (
    <nav className="flex flex-col items-center justify-between gap-3 pt-4 sm:flex-row" aria-label="Pagination">
      <p className="text-sm text-muted">{t("pagination.showing", { from, to, total })}</p>
      <div className="flex items-center gap-1">
        <Link aria-label={t("pagination.previous")} href={href(Math.max(1, page - 1))} className={cn(btn, "text-ink-2 hover:bg-surface-2", page === 1 && "pointer-events-none opacity-40")}>
          <ChevronLeft className="rtl-flip size-4" />
        </Link>
        {nums.map((n, i) => (
          <span key={n} className="flex items-center gap-1">
            {i > 0 && nums[i - 1] !== n - 1 && <span className="px-1 text-muted">…</span>}
            <Link href={href(n)} aria-current={n === page ? "page" : undefined} className={cn(btn, n === page ? "bg-brand-600 text-white" : "text-ink-2 hover:bg-surface-2")}>
              {n}
            </Link>
          </span>
        ))}
        <Link aria-label={t("pagination.next")} href={href(Math.min(pages, page + 1))} className={cn(btn, "text-ink-2 hover:bg-surface-2", page === pages && "pointer-events-none opacity-40")}>
          <ChevronRight className="rtl-flip size-4" />
        </Link>
      </div>
    </nav>
  );
}

/** Helper for list pages: parse ?page and compute skip/take. */
export function paging(searchParams: Record<string, string | string[] | undefined>, pageSize = 12) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

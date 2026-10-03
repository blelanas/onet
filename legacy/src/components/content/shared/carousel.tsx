"use client";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Horizontal scroll-snap carousel with arrow buttons (swipe on touch devices). */
export function Carousel({ title, children, className, action }: { title: React.ReactNode; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  const t = useTranslations("common.actions");
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: dir * (rtl ? -1 : 1) * el.clientWidth * 0.85, behavior: "smooth" });
  };
  return (
    <section className={cn("min-w-0", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold text-ink">{title}</h2>
        <div className="flex items-center gap-1">
          {action}
          <button type="button" onClick={() => scroll(-1)} className="hidden size-9 place-items-center rounded-full border border-line bg-surface text-ink-2 hover:bg-surface-2 sm:grid" aria-label={t("previous")}>
            <ChevronLeft className="rtl-flip size-4" />
          </button>
          <button type="button" onClick={() => scroll(1)} className="hidden size-9 place-items-center rounded-full border border-line bg-surface text-ink-2 hover:bg-surface-2 sm:grid" aria-label={t("next")}>
            <ChevronRight className="rtl-flip size-4" />
          </button>
        </div>
      </div>
      <div ref={ref} className="scrollbar-none -mx-3 flex snap-x snap-mandatory scroll-px-3 gap-4 overflow-x-auto scroll-smooth px-3 pb-2 sm:mx-0 sm:scroll-px-0 sm:px-0">
        {children}
      </div>
    </section>
  );
}

"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type GalleryPhoto = { id: string; imageUrl: string; caption: string | null };

/** Photo grid + accessible lightbox (Esc, arrow keys — RTL aware —, swipe, focus trap & restore). */
export function GalleryGrid({ items, variant = "grid", className }: { items: GalleryPhoto[]; variant?: "grid" | "mosaic"; className?: string }) {
  const t = useTranslations("public.gallery");
  const [index, setIndex] = useState<number | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const open = (i: number, el: HTMLElement) => {
    triggerRef.current = el;
    setIndex(i);
  };
  const close = useCallback(() => {
    setIndex(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  return (
    <>
      <ul
        className={cn(
          variant === "mosaic" ? "grid auto-rows-[130px] grid-cols-2 gap-3 sm:auto-rows-[170px] md:grid-cols-4" : "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4",
          className,
        )}
      >
        {items.map((p, i) => {
          const caption = p.caption || t("untitled");
          const big = variant === "mosaic" && (i === 0 || i === 3);
          return (
            <li key={p.id} className={cn(big && "row-span-2 md:col-span-2", variant === "grid" && "aspect-square")}>
              <button
                type="button"
                onClick={(e) => open(i, e.currentTarget)}
                aria-label={t("open", { caption })}
                className="group relative block size-full overflow-hidden rounded-3xl bg-surface-2 shadow-[var(--shadow-soft)] focus-visible:ring-4 focus-visible:ring-brand-200"
              >
                <img src={p.imageUrl} alt="" loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/60 via-black/10 to-transparent p-3 pt-10 text-start">
                  <span className="line-clamp-2 text-sm font-extrabold text-white drop-shadow">{caption}</span>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/90 text-ink opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Expand className="size-4" aria-hidden />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {index !== null && items[index] && <Lightbox items={items} index={index} setIndex={setIndex} onClose={close} />}
    </>
  );
}

function Lightbox({ items, index, setIndex, onClose }: { items: GalleryPhoto[]; index: number; setIndex: (i: number) => void; onClose: () => void }) {
  const t = useTranslations("public.gallery");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);
  const total = items.length;
  const photo = items[index];
  const prev = useCallback(() => setIndex((index - 1 + total) % total), [index, total, setIndex]);
  const next = useCallback(() => setIndex((index + 1) % total), [index, total, setIndex]);

  useEffect(() => {
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const rtl = document.documentElement.dir === "rtl";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        (rtl ? prev : next)();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        (rtl ? next : prev)();
      } else if (e.key === "Tab") {
        // Focus trap
        const nodes = dialogRef.current?.querySelectorAll<HTMLElement>("button");
        if (!nodes?.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  const caption = photo.caption || t("untitled");

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={t("dialog")}
      className="fixed inset-0 z-[70] flex animate-[var(--animate-pop)] flex-col bg-ink/95 text-white backdrop-blur"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) < 50) return;
        const rtl = document.documentElement.dir === "rtl";
        // Swipe towards the "start" edge reveals the next photo.
        if (dx < 0) (rtl ? prev : next)();
        else (rtl ? next : prev)();
      }}
    >
      <div className="flex items-center justify-between gap-3 p-3 sm:p-5">
        <p className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold tabular-nums" aria-live="polite">
          {t("counter", { index: index + 1, total })}
        </p>
        <button ref={closeRef} type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full bg-white/10 transition hover:bg-white/20" aria-label={t("close")}>
          <X className="size-5" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 sm:px-20" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <figure className="flex max-h-full max-w-5xl flex-col items-center">
          <img key={photo.id} src={photo.imageUrl} alt={caption} className="max-h-[70dvh] w-auto max-w-full animate-[var(--animate-pop)] rounded-2xl object-contain shadow-2xl" />
          <figcaption className="mt-4 text-center font-display text-lg font-bold sm:text-xl">{caption}</figcaption>
        </figure>
        {total > 1 && (
          <>
            <button type="button" onClick={prev} className="absolute start-2 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 transition hover:bg-white/25 sm:start-5" aria-label={t("prev")}>
              <ChevronLeft className="rtl-flip size-6" />
            </button>
            <button type="button" onClick={next} className="absolute end-2 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 transition hover:bg-white/25 sm:end-5" aria-label={t("next")}>
              <ChevronRight className="rtl-flip size-6" />
            </button>
          </>
        )}
      </div>
      <p className="p-4 text-center text-xs text-white/50">{t("hint")}</p>
    </div>
  );
}

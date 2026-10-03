/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Brand lockup. The mark is /public/brand/onet-mark.svg — replace that file with the official
 * ONET Teboulba logo and it propagates everywhere (navbar, sidebar, favicon via src/app/icon.svg).
 */
export function Logo({ href = "/", className, light, compact, subtitle = "Teboulba" }: { href?: string; className?: string; light?: boolean; compact?: boolean; subtitle?: string }) {
  return (
    <Link href={href} className={cn("group flex items-center gap-2.5", className)} aria-label="ONET Teboulba">
      <img src="/brand/onet-mark.svg" alt="" className="size-10 shrink-0 transition-transform duration-300 group-hover:-rotate-6" />
      {!compact && (
        <span className="leading-none">
          <span className={cn("block font-display text-xl font-extrabold tracking-tight", light ? "text-white" : "text-ink")} dir="ltr">
            ONET
          </span>
          <span className={cn("block text-[11px] font-extrabold tracking-[0.18em] uppercase", light ? "text-white/70" : "text-brand-600")}>{subtitle}</span>
        </span>
      )}
    </Link>
  );
}

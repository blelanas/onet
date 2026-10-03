import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Burst, Squiggle, Star } from "./shapes";

/** Colourful banner used at the top of every inner public page. */
export async function PageHero({
  title,
  subtitle,
  eyebrow,
  color = "#E30613",
  icon,
  crumbs,
  children,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  color?: string;
  icon?: React.ReactNode;
  crumbs?: { href: string; label: string }[];
  children?: React.ReactNode;
  className?: string;
}) {
  const t = await getTranslations("public.nav");
  return (
    <div className={cn("mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8", className)}>
      <div
        className="relative isolate overflow-hidden rounded-[2rem] px-6 py-9 text-white shadow-[var(--shadow-lift)] sm:px-10 sm:py-12"
        style={{ background: `radial-gradient(120% 140% at 100% 0%, ${color}CC 0%, transparent 55%), linear-gradient(135deg, ${color} 0%, ${color}E6 60%, ${color}B3 100%)` }}
      >
        <div className="bg-confetti absolute inset-0 -z-10 opacity-60" aria-hidden />
        <Burst className="absolute -end-10 -top-10 -z-10 size-48 text-white/10 sm:size-64" />
        <Squiggle className="absolute end-8 bottom-6 -z-10 hidden w-28 text-white/25 sm:block" />
        <Star className="absolute end-[28%] top-6 -z-10 size-6 animate-[var(--animate-float)] text-sun" />
        <Star className="absolute end-[12%] bottom-10 -z-10 size-4 animate-[var(--animate-float)] text-white/70 [animation-delay:1.2s]" />
        {crumbs && crumbs.length > 0 && (
          <nav aria-label={t("breadcrumb")} className="mb-4">
            <ol className="flex flex-wrap items-center gap-1 text-sm font-bold text-white/75">
              {crumbs.map((c) => (
                <li key={c.href} className="flex items-center gap-1">
                  <Link href={c.href} className="rounded hover:text-white hover:underline">
                    {c.label}
                  </Link>
                  <ChevronRight className="rtl-flip size-3.5" aria-hidden />
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className="flex items-start gap-4">
          {icon && <div className="hidden size-14 shrink-0 -rotate-6 place-items-center rounded-2xl bg-white/95 shadow-lg sm:grid [&_svg]:size-7" style={{ color }}>{icon}</div>}
          <div className="min-w-0 max-w-3xl">
            {eyebrow && <p className="mb-2 text-xs font-extrabold tracking-[0.16em] text-white/80 uppercase">{eyebrow}</p>}
            <h1 className="text-3xl leading-[1.1] font-extrabold text-balance sm:text-5xl">{title}</h1>
            {subtitle && <p className="mt-3 max-w-2xl text-base text-white/85 sm:text-lg">{subtitle}</p>}
          </div>
        </div>
        {children && <div className="relative mt-6">{children}</div>}
      </div>
    </div>
  );
}

/** Section title with colored eyebrow bar and optional "see all" link. */
export function SectionHeading({
  title,
  subtitle,
  href,
  linkLabel,
  color = "#E30613",
  light,
  className,
  id,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  href?: string;
  linkLabel?: string;
  color?: string;
  light?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mb-8", className)}>
      <div className="min-w-0 max-w-2xl">
        <span className="mb-3 block h-1.5 w-12 rounded-full" style={{ background: color }} aria-hidden />
        <h2 id={id} className={cn("text-2xl leading-tight font-extrabold sm:text-4xl", light ? "text-white" : "text-ink")}>
          {title}
        </h2>
        {subtitle && <p className={cn("mt-2 text-base", light ? "text-white/75" : "text-muted")}>{subtitle}</p>}
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className={cn(
            "group inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold transition",
            light ? "bg-white/10 text-white hover:bg-white/20" : "bg-surface text-ink shadow-[var(--shadow-soft)] ring-1 ring-line hover:ring-brand-200",
          )}
        >
          {linkLabel}
          <ChevronRight className="rtl-flip size-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

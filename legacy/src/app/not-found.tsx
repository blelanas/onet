import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Home } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { LocaleSwitcher } from "@/components/layout/app-shell";
import { buttonClasses } from "@/components/ui/button";
import { PUBLIC_NAV } from "@/components/public/nav-items";
import { Star } from "@/components/public/shapes";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("public.notFound");
  return { title: t("title"), robots: { index: false } };
}

export default async function NotFound() {
  const [t, tn] = await Promise.all([getTranslations("public.notFound"), getTranslations("public.nav")]);
  return (
    <div className="bg-confetti relative flex min-h-dvh flex-col overflow-hidden">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Logo href="/" />
        <LocaleSwitcher />
      </header>
      <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 pb-16 text-center">
        <div className="relative" aria-hidden>
          <svg viewBox="0 0 320 200" className="w-[300px] sm:w-[400px]">
            <path d="M84 120 C78 150 92 165 86 196" stroke="#C9BFD9" strokeWidth="2" fill="none" />
            <path d="M236 112 C244 146 230 166 238 196" stroke="#C9BFD9" strokeWidth="2" fill="none" />
            <text x="160" y="150" textAnchor="middle" fontSize="150" fontWeight="800" fill="#221B33" fontFamily="var(--font-heading), sans-serif" opacity=".06">
              404
            </text>
            <g className="animate-[var(--animate-float)]">
              <ellipse cx="84" cy="80" rx="36" ry="42" fill="#E30613" />
              <ellipse cx="72" cy="64" rx="8" ry="13" fill="#fff" opacity=".4" />
              <path d="M80 121 l4 -6 l4 6z" fill="#E30613" />
            </g>
            <g className="animate-[var(--animate-float)] [animation-delay:.8s]">
              <ellipse cx="160" cy="58" rx="34" ry="40" fill="#FFB400" />
              <ellipse cx="148" cy="42" rx="7" ry="12" fill="#fff" opacity=".45" />
              <path d="M160 98 C156 130 166 150 160 196" stroke="#C9BFD9" strokeWidth="2" fill="none" />
            </g>
            <g className="animate-[var(--animate-float)] [animation-delay:1.6s]">
              <ellipse cx="236" cy="72" rx="36" ry="42" fill="#1E9BD7" />
              <ellipse cx="224" cy="56" rx="8" ry="13" fill="#fff" opacity=".4" />
            </g>
          </svg>
          <Star className="absolute end-2 top-0 size-6 text-grape" />
          <Star className="absolute start-4 bottom-8 size-4 text-leaf" />
        </div>
        <p className="mt-2 font-display text-7xl leading-none font-extrabold text-brand-600 sm:text-8xl" dir="ltr">
          {t("code")}
        </p>
        <h1 className="mt-4 text-3xl font-extrabold text-balance text-ink sm:text-4xl">{t("title")}</h1>
        <p className="mt-3 max-w-lg text-lg text-muted">{t("text")}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className={buttonClasses("primary", "lg", "rounded-full")}>
            <Home className="size-5" /> {t("home")}
          </Link>
          <Link href="/activities" className={buttonClasses("outline", "lg", "rounded-full")}>
            {tn("activities")} <ArrowRight className="rtl-flip size-4" />
          </Link>
        </div>
        <nav aria-label={tn("main")} className="mt-10">
          <ul className="flex flex-wrap justify-center gap-2">
            {PUBLIC_NAV.map((i) => (
              <li key={i.key}>
                <Link href={i.href} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-bold text-ink-2 shadow-[var(--shadow-soft)] ring-1 ring-line hover:text-ink">
                  <span className="size-2 rounded-full" style={{ background: i.color }} aria-hidden />
                  {tn(i.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
    </div>
  );
}

import { useTranslations } from "use-intl";
import { ArrowRight, Home, RotateCcw } from "lucide-react";
import { ApiError } from "@/lib/api";
import { Link } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { LocaleSwitcher } from "@/components/layout/app-shell";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PUBLIC_NAV } from "./nav-items";
import { Star } from "./shapes";

/** Loading state of a public page (was app/(public)/loading.tsx). */
export function PublicSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8" aria-busy="true">
      <Skeleton className="h-52 rounded-[2rem] sm:h-64" />
      <div className="mt-8 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-80 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

/** Error state of a public page (was app/(public)/error.tsx). */
export function PublicError({ reset }: { reset: () => void }) {
  const t = useTranslations("public");
  const tc = useTranslations("common");
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <div className="card">
        <EmptyState
          title={t("error.title")}
          description={t("error.text")}
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={reset} className="rounded-full">
                <RotateCcw className="size-4" /> {tc("actions.retry")}
              </Button>
              <Link href="/" className={buttonClasses("outline", "md", "rounded-full")}>
                <Home className="size-4" /> {t("notFound.home")}
              </Link>
            </div>
          }
        />
      </div>
    </div>
  );
}

/**
 * Branded 404 (was app/not-found.tsx). `standalone` renders the full page with its own mini header
 * (unknown URLs); otherwise it is rendered inside the public layout (unknown event / trip / article).
 */
export function NotFoundView({ standalone }: { standalone?: boolean }) {
  const t = useTranslations("public.notFound");
  const tn = useTranslations("public.nav");
  usePageTitle(t("title"));
  const Main = standalone ? "main" : "div";
  return (
    <div className={cn("bg-confetti relative flex flex-col overflow-hidden", standalone ? "min-h-dvh" : "min-h-[70dvh]")}>
      {standalone && (
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Logo href="/" />
          <LocaleSwitcher />
        </header>
      )}
      <Main id={standalone ? "main" : undefined} className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 pb-16 text-center">
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
      </Main>
    </div>
  );
}

/** Results area of a list page (hero + filters stay on screen while the results load). */
export function ResultsQueryView<T>({ query, children }: { query: { data: T | undefined; error: unknown; isLoading: boolean; refetch: () => unknown }; children: (data: T) => React.ReactNode }) {
  if (query.error) return <PublicError reset={() => query.refetch()} />;
  if (query.isLoading || query.data === undefined)
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-80 rounded-3xl" />
        ))}
      </div>
    );
  return <>{children(query.data)}</>;
}

/**
 * Public counterpart of QueryView: public skeleton while loading, branded 404, public error state.
 * Keeps the previous data on screen while a filter change refetches (useApi keeps previous data).
 */
export function PublicQueryView<T>({ query, children }: { query: { data: T | undefined; error: unknown; isLoading: boolean; refetch: () => unknown }; children: (data: T) => React.ReactNode }) {
  if (query.error instanceof ApiError && query.error.status === 404) return <NotFoundView />;
  if (query.error) return <PublicError reset={() => query.refetch()} />;
  if (query.isLoading || query.data === undefined) return <PublicSkeleton />;
  return <>{children(query.data)}</>;
}

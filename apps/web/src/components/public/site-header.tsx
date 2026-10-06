import { useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { usePathname } from "@/lib/router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, LayoutDashboard, LogIn, Menu, Sparkles, X } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { LocaleSwitcher } from "@/components/layout/app-shell";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PUBLIC_NAV, isNavActive } from "./nav-items";

export function SiteHeader({ loggedIn }: { loggedIn: boolean }) {
  const t = useTranslations("public.nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const moreRef = useRef<HTMLLIElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  const primary = PUBLIC_NAV.filter((i) => i.primary);
  const secondary = PUBLIC_NAV.filter((i) => !i.primary);
  const secondaryActive = secondary.some((i) => isNavActive(pathname, i.href));
  // On the home page the header floats transparently over the red hero until the user scrolls.
  const light = pathname === "/" && !scrolled;

  useEffect(() => {
    setOpen(false);
    setMore(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => !moreRef.current?.contains(e.target as Node) && setMore(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMore(false);
      setOpen((o) => {
        if (o) burgerRef.current?.focus();
        return false;
      });
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const account = loggedIn ? (
    <Link href="/dashboard" className={buttonClasses("outline", "md", cn("rounded-full", light && "border-white/40 bg-white/10 text-white hover:bg-white/20"))}>
      <LayoutDashboard className="size-4" /> {t("mySpace")}
    </Link>
  ) : (
    <Link href="/login" className={buttonClasses("ghost", "md", cn("rounded-full", light && "text-white hover:bg-white/15 hover:text-white"))}>
      <LogIn className="rtl-flip size-4" /> {t("login")}
    </Link>
  );

  return (
    <>
    <header className={cn("sticky top-0 z-40 transition-[background,box-shadow] duration-300", light ? "bg-transparent" : scrolled ? "bg-canvas/90 shadow-[0_1px_0_var(--line),0_8px_24px_-16px_rgb(34_27_51/0.25)] backdrop-blur-md" : "bg-canvas/80 backdrop-blur-sm")}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:h-[72px] lg:px-8">
        <Logo href="/" light={light} />

        <nav aria-label={t("main")} className="ms-4 hidden flex-1 lg:block">
          <ul className="flex items-center gap-0.5">
            {primary.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn("relative rounded-full px-3 py-2 text-[15px] font-bold transition-colors", light ? (active ? "text-white" : "text-white/85 hover:bg-white/15 hover:text-white") : active ? "text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink")}
                  >
                    {t(item.key)}
                    {active && <span className="absolute inset-x-3 -bottom-0.5 h-[3px] rounded-full" style={{ background: light ? "#FFB400" : item.color }} aria-hidden />}
                  </Link>
                </li>
              );
            })}
            <li className="relative" ref={moreRef}>
              <button
                type="button"
                onClick={() => setMore((m) => !m)}
                aria-expanded={more}
                aria-haspopup="true"
                className={cn("flex items-center gap-1 rounded-full px-3 py-2 text-[15px] font-bold transition-colors", light ? "text-white/85 hover:bg-white/15 hover:text-white" : cn("hover:bg-surface-2", secondaryActive ? "text-ink" : "text-ink-2"))}
              >
                {t("more")}
                <ChevronDown className={cn("size-4 transition-transform", more && "rotate-180")} />
              </button>
              {more && (
                <ul className="absolute start-0 top-full z-50 mt-2 w-60 animate-[var(--animate-pop)] rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow-lift)]">
                  {secondary.map((item) => {
                    const active = isNavActive(pathname, item.href);
                    const Icon = item.icon;
                    return (
                      <li key={item.key}>
                        <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-ink-2 hover:bg-surface-2 hover:text-ink", active && "bg-surface-2 text-ink")}>
                          <span className="grid size-8 place-items-center rounded-lg text-white" style={{ background: item.color }}>
                            <Icon className="size-4" />
                          </span>
                          {t(item.key)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          </ul>
        </nav>

        <div className="ms-auto flex items-center gap-1.5 lg:ms-0">
          <LocaleSwitcher light={light} />
          <div className="hidden sm:block">{account}</div>
          <Link href="/join" className={buttonClasses(light ? "sun" : "primary", "md", "hidden rounded-full xl:inline-flex")}>
            <Sparkles className="size-4" /> {t("join")}
          </Link>
          <button
            ref={burgerRef}
            type="button"
            onClick={() => setOpen(true)}
            className={cn("grid size-11 place-items-center rounded-full transition active:scale-95 lg:hidden", light ? "bg-white text-brand-700" : "bg-ink text-white")}
            aria-label={t("openMenu")}
            aria-expanded={open}
            aria-controls="public-mobile-menu"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>
    </header>

      {/* Mobile menu (outside <header>: its backdrop-filter would trap position:fixed) */}
      <div
        id="public-mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label={t("menuTitle")}
        className={cn("fixed inset-0 z-50 flex flex-col bg-canvas transition-[opacity,transform] duration-300 lg:hidden", open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-3 opacity-0")}
      >
        <div className="bg-confetti absolute inset-0 opacity-70" aria-hidden />
        <div className="relative flex h-16 shrink-0 items-center justify-between px-4 sm:px-6">
          <Logo href="/" />
          <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full bg-surface text-ink shadow-[var(--shadow-soft)]" aria-label={t("closeMenu")}>
            <X className="size-5" />
          </button>
        </div>
        <div className="relative flex-1 overflow-y-auto px-4 pt-2 pb-8 sm:px-6">
          <p className="font-display text-2xl font-extrabold text-ink">{t("menuTitle")}</p>
          <p className="text-sm text-muted">{t("menuHint")}</p>
          <nav aria-label={t("main")} className="mt-4">
            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <li className="col-span-2 sm:col-span-3">
                <Link href="/" aria-current={pathname === "/" ? "page" : undefined} className={cn("flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 font-bold text-ink shadow-[var(--shadow-soft)]", pathname === "/" && "ring-2 ring-brand-600")}>
                  {t("home")}
                  <ArrowRight className="rtl-flip size-4 text-muted" />
                </Link>
              </li>
              {PUBLIC_NAV.map((item, i) => {
                const active = isNavActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.key} style={{ animationDelay: `${i * 30}ms` }} className={open ? "animate-[var(--animate-fade-up)]" : undefined}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn("flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-3.5 font-bold text-ink shadow-[var(--shadow-soft)] active:scale-[0.98]", active && "ring-2")}
                      style={active ? ({ "--tw-ring-color": item.color } as React.CSSProperties) : undefined}
                    >
                      <span className="grid size-10 place-items-center rounded-xl text-white" style={{ background: item.color }}>
                        <Icon className="size-5" />
                      </span>
                      {t(item.key)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        <div className="relative grid shrink-0 grid-cols-2 gap-2.5 border-t border-line bg-surface/90 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
          <Link href={loggedIn ? "/dashboard" : "/login"} className={buttonClasses("outline", "lg", "rounded-full px-3")}>
            {loggedIn ? <LayoutDashboard className="size-4" /> : <LogIn className="rtl-flip size-4" />}
            {loggedIn ? t("mySpace") : t("login")}
          </Link>
          <Link href="/join" className={buttonClasses("primary", "lg", "rounded-full px-3")}>
            <Sparkles className="size-4" /> {t("join")}
          </Link>
        </div>
      </div>
    </>
  );
}

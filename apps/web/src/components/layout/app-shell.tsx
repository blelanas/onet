import { useLocale, useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { useNavigate, usePathname, useRouter } from "@/lib/router";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Bell, ChevronDown, Globe, Home, LogOut, Menu, Search, Star, User, X } from "lucide-react";
import { LOCALES, LOCALE_LABELS } from "@onet/shared";
import { signOut } from "@/lib/auth";
import { useLocaleSwitch } from "@/lib/i18n";
import type { RoleKey } from "@onet/shared";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "./logo";
import { mobileTabs, visibleNav, type NavItem } from "./nav-config";

export type ShellUser = {
  name: string;
  email: string;
  avatarUrl: string | null;
  roles: RoleKey[];
  perms: string[];
  points: number;
};

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
}

export function AppShell({ user, unread, children }: { user: ShellUser; unread: number; children: React.ReactNode }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const ctx = useMemo(() => ({ perms: new Set(user.perms), roles: user.roles }), [user.perms, user.roles]);
  const sections = useMemo(() => visibleNav(ctx), [ctx]);
  const allItems = sections.flatMap((s) => s.items);
  const tabs = mobileTabs(ctx)
    .map((k) => allItems.find((i) => i.key === k))
    .filter((x): x is NavItem => !!x);
  const isKid = user.roles.length === 1 && user.roles[0] === "kid";

  useEffect(() => setDrawer(false), [pathname]);

  const nav = (
    <nav className="space-y-5" aria-label={t("aria.main")}>
      {sections.map((s) => (
        <div key={s.key}>
          {s.key !== "main" && <p className="mb-1.5 px-3 text-[11px] font-extrabold tracking-[0.14em] text-muted/80 uppercase">{t(`sections.${s.key}`)}</p>}
          <ul className="space-y-0.5">
            {s.items.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] font-bold transition-colors",
                      active ? "bg-brand-600 text-white shadow-[var(--shadow-brand)]" : "text-ink-2 hover:bg-brand-50 hover:text-brand-700",
                    )}
                  >
                    <Icon className={cn("size-[18px] shrink-0", !active && "text-muted group-hover:text-brand-600")} />
                    <span className="truncate">{t(`items.${item.key}`)}</span>
                    {item.key === "notifications" && unread > 0 && (
                      <span className={cn("ms-auto rounded-full px-1.5 text-[11px] font-extrabold", active ? "bg-white text-brand-700" : "bg-brand-600 text-white")}>{unread}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className={cn("min-h-dvh", isKid && "bg-confetti")}>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-[272px] flex-col border-e border-line bg-surface lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo href="/dashboard" />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pt-2 pb-6">{nav}</div>
        <div className="border-t border-line p-3">
          <Link href="/" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-muted hover:bg-surface-2 hover:text-ink">
            <Home className="size-4" /> {t("items.publicSite")}
          </Link>
        </div>
      </aside>

      {/* Mobile drawer */}
      <div className={cn("fixed inset-0 z-50 overflow-hidden lg:hidden", drawer ? "pointer-events-auto" : "pointer-events-none invisible")} aria-hidden={!drawer}>
        <div className={cn("absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity", drawer ? "opacity-100" : "opacity-0")} onClick={() => setDrawer(false)} />
        <div
          className={cn(
            "absolute inset-y-0 start-0 flex w-[86%] max-w-xs flex-col bg-surface shadow-2xl transition-transform duration-300",
            drawer ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
          )}
          role="dialog"
          aria-modal="true"
          aria-label={t("aria.menu")}
        >
          <div className="flex h-16 items-center justify-between px-4">
            <Logo href="/dashboard" />
            <button onClick={() => setDrawer(false)} className="rounded-xl p-2 text-muted hover:bg-surface-2" aria-label={t("aria.closeMenu")}>
              <X className="size-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-24">{nav}</div>
        </div>
      </div>

      <div className="lg:ps-[272px]">
        <Topbar user={user} unread={unread} onMenu={() => setDrawer(true)} />
        <main id="main" className="mx-auto w-full max-w-[1400px] px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label={t("aria.tabs")}>
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {tabs.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold", active ? "text-brand-600" : "text-muted")}>
                  <span className={cn("grid h-7 w-12 place-items-center rounded-full transition", active && "bg-brand-50")}>
                    <Icon className="size-5" />
                  </span>
                  <span className="max-w-full truncate px-1">{t(`items.${item.key}`)}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button onClick={() => setDrawer(true)} className="flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-bold text-muted">
              <span className="grid h-7 w-12 place-items-center rounded-full">
                <Menu className="size-5" />
              </span>
              {t("items.more")}
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

function Topbar({ user, unread, onMenu }: { user: ShellUser; unread: number; onMenu: () => void }) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const isKid = user.roles.length === 1 && user.roles[0] === "kid";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <button onClick={onMenu} className="-ms-1 rounded-xl p-2 text-ink-2 hover:bg-surface-2 lg:hidden" aria-label={t("aria.openMenu")}>
          <Menu className="size-5" />
        </button>
        <Logo href="/dashboard" compact className="lg:hidden" />
        <form
          role="search"
          className="relative ms-1 hidden flex-1 md:block md:max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) router.push(`/dashboard/search?q=${encodeURIComponent(q.trim())}`);
          }}
        >
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            placeholder={t("search.placeholder")}
            aria-label={t("search.placeholder")}
            className="h-10 w-full rounded-xl border border-line bg-surface ps-10 pe-14 text-sm shadow-[var(--shadow-soft)] focus:border-brand-300 focus:ring-4 focus:ring-brand-100 focus:outline-none"
          />
          <kbd className="pointer-events-none absolute end-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-line bg-surface-2 px-1.5 text-[10px] font-bold text-muted lg:block" dir="ltr">
            Ctrl K
          </kbd>
        </form>
        <div className="ms-auto flex items-center gap-1 sm:gap-2">
          <Link href="/dashboard/search" className="rounded-xl p-2 text-ink-2 hover:bg-surface-2 md:hidden" aria-label={t("search.placeholder")}>
            <Search className="size-5" />
          </Link>
          {isKid && (
            <span className="hidden items-center gap-1 rounded-full bg-sun-soft px-3 py-1.5 text-sm font-extrabold text-amber-700 sm:flex">
              <Star className="size-4" fill="currentColor" /> {user.points}
            </span>
          )}
          <LocaleSwitcher />
          <Link href="/dashboard/notifications" className="relative rounded-xl p-2 text-ink-2 hover:bg-surface-2" aria-label={t("items.notifications")}>
            <Bell className="size-5" />
            {unread > 0 && (
              <span className="absolute end-1 top-1 grid min-w-[18px] place-items-center rounded-full bg-brand-600 px-1 text-[10px] leading-[18px] font-extrabold text-white ring-2 ring-canvas">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}

export function LocaleSwitcher({ light }: { light?: boolean }) {
  const locale = useLocale();
  const { setLocale } = useLocaleSwitch();
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn("flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-bold", light ? "text-white hover:bg-white/10" : "text-ink-2 hover:bg-surface-2", pending && "opacity-60")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("language")}
      >
        <Globe className="size-4" />
        <span className="hidden sm:inline">{LOCALE_LABELS[locale as keyof typeof LOCALE_LABELS]?.flag}</span>
      </button>
      {open && (
        <ul role="menu" className="absolute end-0 z-50 mt-2 w-44 animate-[var(--animate-pop)] overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow-lift)]">
          {LOCALES.map((l) => (
            <li key={l}>
              <button
                role="menuitemradio"
                aria-checked={l === locale}
                onClick={() => {
                  setOpen(false);
                  start(async () => {
                    await setLocale(l);
                  });
                }}
                className={cn("flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-bold text-ink-2 hover:bg-surface-2", l === locale && "bg-brand-50 text-brand-700")}
              >
                <span lang={l}>{LOCALE_LABELS[l].native}</span>
                <span className="text-xs text-muted">{LOCALE_LABELS[l].flag}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  const navigate = useNavigate();
  const t = useTranslations("nav");
  const tr = useTranslations("common.roles");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-xl p-1 pe-2 hover:bg-surface-2" aria-haspopup="menu" aria-expanded={open} aria-label={t("aria.userMenu")}>
        <Avatar name={user.name} src={user.avatarUrl} size="sm" />
        <span className="hidden text-start leading-tight xl:block">
          <span className="block max-w-[140px] truncate text-sm font-bold text-ink">{user.name}</span>
          <span className="block text-[11px] font-semibold text-muted">{tr(user.roles[0] ?? "member")}</span>
        </span>
        <ChevronDown className="hidden size-4 text-muted xl:block" />
      </button>
      {open && (
        <div role="menu" className="absolute end-0 z-50 mt-2 w-64 animate-[var(--animate-pop)] overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-lift)]">
          <div className="border-b border-line bg-surface-2/60 p-4">
            <p className="truncate font-bold text-ink">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {user.roles.map((r) => (
                <span key={r} className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                  {tr(r)}
                </span>
              ))}
            </div>
          </div>
          <div className="p-1.5">
            <Link role="menuitem" href="/dashboard/profile" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-ink-2 hover:bg-surface-2">
              <User className="size-4" /> {t("items.profile")}
            </Link>
            <Link role="menuitem" href="/" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-ink-2 hover:bg-surface-2">
              <Home className="size-4" /> {t("items.publicSite")}
            </Link>
            <button
              role="menuitem"
              type="button"
              onClick={async () => {
                await signOut();
                navigate("/login");
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
            >
              <LogOut className="rtl-flip size-4" /> {t("items.logout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

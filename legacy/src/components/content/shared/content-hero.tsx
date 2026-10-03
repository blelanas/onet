import { Breadcrumbs, type Crumb } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

const THEMES = {
  songs: "from-[#E30613] via-[#E8457C] to-[#7C4DFF]",
  games: "from-[#FFB400] via-[#FF6B4A] to-[#E8457C]",
  conferences: "from-[#1E9BD7] via-[#7C4DFF] to-[#E8457C]",
  resources: "from-[#00A3A3] via-[#2BB673] to-[#1E9BD7]",
} as const;

/** Colorful section banner used at the top of every content page. */
export function ContentHero({
  theme,
  title,
  description,
  eyebrow,
  icon,
  actions,
  breadcrumbs,
  children,
}: {
  theme: keyof typeof THEMES;
  title: string;
  description?: string;
  eyebrow?: string;
  icon: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Crumb[];
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-6 animate-[var(--animate-fade-up)]">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className={cn("relative isolate overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-[var(--shadow-lift)] sm:p-7", THEMES[theme])}>
        <svg aria-hidden className="absolute inset-0 -z-10 size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 240">
          <circle cx="700" cy="30" r="120" fill="#fff" opacity=".1" />
          <circle cx="560" cy="250" r="90" fill="#fff" opacity=".08" />
          <circle cx="90" cy="220" r="60" fill="#fff" opacity=".07" />
          <circle cx="430" cy="40" r="6" fill="#FFF4D6" opacity=".9" />
          <circle cx="620" cy="160" r="4" fill="#fff" opacity=".8" />
          <rect x="300" y="170" width="14" height="14" rx="4" fill="#fff" opacity=".35" transform="rotate(25 307 177)" />
          <path d="M470 120 q 18 -22 36 0 t 36 0 t 36 0" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" opacity=".35" />
        </svg>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur [&_svg]:size-7">{icon}</div>
            <div className="min-w-0">
              {eyebrow && <p className="text-xs font-extrabold tracking-wide text-white/80 uppercase">{eyebrow}</p>}
              <h1 className="text-3xl leading-tight font-extrabold sm:text-4xl">{title}</h1>
              {description && <p className="mt-1 max-w-xl text-sm text-white/85 sm:text-base">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </header>
  );
}

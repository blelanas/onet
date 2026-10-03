import { getLocale, getTranslations } from "next-intl/server";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** Hour of the day in Tunisia (the association's time zone), whatever the server's TZ. */
export function tunisHour(d = new Date()) {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Tunis" }).format(d)) % 24;
}

export async function greetingKey() {
  const h = tunisHour();
  return h < 12 && h >= 4 ? "morning" : h < 18 && h >= 12 ? "afternoon" : "evening";
}

const THEMES = {
  brand: "from-brand-600 via-[#f0442c] to-coral",
  finance: "from-[#0f7a4f] via-leaf to-teal",
  monitor: "from-sky via-[#3f86e8] to-grape",
  parent: "from-grape via-[#a24de0] to-[#E8457C]",
  member: "from-teal via-sky to-grape",
} as const;

/**
 * Warm gradient header shared by every dashboard flavour: greeting, long date and an optional
 * right-hand slot (KPI pill, child switcher, etc.).
 */
export async function GreetingHeader({
  name,
  subtitle,
  theme = "brand",
  children,
  eyebrow,
}: {
  name: string;
  subtitle: string;
  theme?: keyof typeof THEMES;
  children?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  const t = await getTranslations("dashboard.greeting");
  const locale = await getLocale();
  const first = name.split(" ")[0];
  return (
    <header className={cn("relative isolate overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-[var(--shadow-lift)] sm:p-7 rtl:bg-gradient-to-bl", THEMES[theme])}>
      <div className="bg-confetti absolute inset-0 -z-10 opacity-60 mix-blend-screen" aria-hidden />
      <svg className="absolute -end-10 -top-16 -z-10 size-64 opacity-15" viewBox="0 0 200 200" aria-hidden>
        <circle cx="100" cy="100" r="100" fill="#fff" />
      </svg>
      <svg className="absolute -bottom-20 end-32 -z-10 size-44 opacity-10" viewBox="0 0 200 200" aria-hidden>
        <circle cx="100" cy="100" r="100" fill="#FFB400" />
      </svg>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 animate-[var(--animate-fade-up)]">
          <p className="text-xs font-bold tracking-wide text-white/80 uppercase sm:text-sm">{eyebrow ?? formatDate(new Date(), locale, "long")}</p>
          <h1 className="mt-1 text-2xl leading-tight font-extrabold sm:text-3xl lg:text-4xl">{t.rich(await greetingKey(), { name: first, n: (c) => <bdi>{c}</bdi> })}</h1>
          <p className="mt-1.5 max-w-xl text-sm text-white/85 sm:text-base">{subtitle}</p>
        </div>
        {children && <div className="min-w-0">{children}</div>}
      </div>
    </header>
  );
}

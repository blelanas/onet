import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronRight, LogIn, Sparkles, Ticket } from "lucide-react";
import { CoverArt } from "@/components/ui/cover-art";
import { Progress } from "@/components/ui/progress";
import { buttonClasses } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category";

/** Large cover header for event / trip / news detail pages. */
export async function DetailHero({
  seed,
  src,
  color,
  category,
  categoryLabel,
  title,
  crumbs,
  children,
}: {
  seed: string;
  src?: string | null;
  color: string;
  category: string;
  categoryLabel: string;
  title: string;
  crumbs: { href: string; label: string }[];
  children?: React.ReactNode;
}) {
  const t = await getTranslations("public.nav");
  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <CoverArt src={src} seed={seed} color={color} className="min-h-[300px] rounded-[2rem] shadow-[var(--shadow-lift)] sm:min-h-[380px]">
        {!src && (
          <div className="absolute end-6 top-6 grid size-20 rotate-6 place-items-center rounded-3xl bg-white/20 text-white ring-1 ring-white/30 backdrop-blur sm:end-10 sm:top-10 sm:size-28" aria-hidden>
            <CategoryIcon category={category} className="size-10 sm:size-14" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-10">
          <nav aria-label={t("breadcrumb")} className="mb-3">
            <ol className="flex flex-wrap items-center gap-1 text-sm font-bold text-white/80">
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-extrabold" style={{ color }}>
            <CategoryIcon category={category} className="size-3.5" />
            {categoryLabel}
          </span>
          <h1 className="mt-3 max-w-4xl text-3xl leading-[1.1] font-extrabold text-balance drop-shadow sm:text-5xl">{title}</h1>
          {children}
        </div>
      </CoverArt>
    </div>
  );
}

export function Fact({ icon, label, children, color }: { icon: React.ReactNode; label: string; children: React.ReactNode; color: string }) {
  return (
    <div className="flex gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl [&_svg]:size-5" style={{ background: `${color}1A`, color }}>
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-extrabold tracking-wide text-muted uppercase">{label}</dt>
        <dd className="font-bold text-ink">{children}</dd>
      </div>
    </div>
  );
}

/**
 * Registration box. Never shows who is registered — only capacity numbers. The CTA sends members
 * to their dashboard (where the real, permission-checked registration happens) or to login.
 */
export async function RegisterPanel({
  kind,
  id,
  loggedIn,
  open,
  closedText,
  left,
  capacity,
  price,
  deadline,
  color,
  children,
}: {
  kind: "events" | "trips";
  id: string;
  loggedIn: boolean;
  open: boolean;
  closedText?: string;
  left: number;
  capacity: number;
  price: number;
  deadline?: Date | null;
  color: string;
  children: React.ReactNode;
}) {
  const [t, tp, tf, locale] = await Promise.all([getTranslations("public.reg"), getTranslations("public.common"), getTranslations("common.fields"), getLocale()]);
  const target = `/dashboard/${kind}/${id}`;
  const href = loggedIn ? target : `/login?next=${encodeURIComponent(target)}`;
  const taken = Math.max(0, capacity - left);
  return (
    <aside className="lg:sticky lg:top-24">
      <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-lift)]">
        <div className="h-2" style={{ background: `linear-gradient(90deg, ${color}, #FFB400)` }} aria-hidden />
        <div className="p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-extrabold text-ink">{t("title")}</h2>
            <p className="font-display text-2xl font-extrabold" style={{ color }}>
              {price > 0 ? formatMoney(price, locale) : tp("free")}
            </p>
          </div>
          <dl className="mt-5 space-y-4">{children}</dl>
          <div className="mt-5 rounded-2xl bg-surface-2 p-4">
            <div className="mb-2 flex items-center justify-between text-sm font-bold">
              <span className="text-ink">{tf("placesLeft", { count: left })}</span>
              <span className="text-muted tabular-nums">{t("placesTaken", { taken, capacity })}</span>
            </div>
            <Progress value={taken} max={capacity} color={left === 0 ? "#E30613" : color} label={tf("placesLeft", { count: left })} />
            {deadline && open && <p className="mt-2 text-xs font-semibold text-muted">{t("deadline", { date: formatDate(deadline, locale, "long") })}</p>}
          </div>
          {open ? (
            <>
              <Link href={href} className={buttonClasses("primary", "lg", "mt-5 h-14 w-full rounded-full text-lg")}>
                <Ticket className="size-5" /> {t("cta")}
              </Link>
              <p className="mt-3 flex items-start gap-2 text-xs text-muted">
                {loggedIn ? <Sparkles className="mt-0.5 size-3.5 shrink-0" /> : <LogIn className="rtl-flip mt-0.5 size-3.5 shrink-0" />}
                {loggedIn ? t("memberHint") : t("loginHint")}
              </p>
            </>
          ) : (
            <p className={cn("mt-5 rounded-2xl border border-dashed border-line p-4 text-center text-sm font-bold text-ink-2")}>{closedText}</p>
          )}
          {!loggedIn && (
            <p className="mt-4 border-t border-line pt-4 text-center text-sm text-muted">
              {t("notMember")}{" "}
              <Link href="/join" className="font-extrabold text-brand-600 hover:underline">
                {t("joinLink")}
              </Link>
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

/** Simple prose block for multi-paragraph descriptions. */
export function Prose({ paragraphs, className }: { paragraphs: string[]; className?: string }) {
  return (
    <div className={cn("space-y-4 text-[17px] leading-relaxed text-ink-2", className)}>
      {paragraphs.map((p, i) => (
        <p key={i} dir="auto" className="whitespace-pre-line">
          {p}
        </p>
      ))}
    </div>
  );
}

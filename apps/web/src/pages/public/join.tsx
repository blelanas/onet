import { useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import { ArrowRight, CheckCircle2, MessageCircle, PartyPopper, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { PageHero } from "@/components/public/page-hero";

const STEPS = [
  { key: "one", icon: UserPlus, tile: "bg-sun text-ink" },
  { key: "two", icon: ShieldCheck, tile: "bg-sky text-white" },
  { key: "three", icon: PartyPopper, tile: "bg-leaf text-white" },
] as const;

/** /join — "Become a member": what membership is, how it works, and the way to the sign-up page. */
export function Component() {
  const t = useTranslations("public.join");
  const tn = useTranslations("public.nav");
  const tm = useTranslations("public.meta.join");
  usePageTitle(tm("title"));
  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} color="#2BB673" icon={<Sparkles />} crumbs={[{ href: "/", label: tn("home") }]}>
        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map(({ key, icon: Icon, tile }, i) => (
            <li key={key} className="flex items-center gap-3 rounded-2xl bg-white/95 p-3 text-ink shadow-lg">
              <span className={`relative grid size-11 shrink-0 place-items-center rounded-xl ${tile}`}>
                <Icon className="size-5" />
                <span className="absolute -end-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-ink text-[11px] font-extrabold text-white">{i + 1}</span>
              </span>
              <span className="min-w-0">
                <span className="block text-sm leading-tight font-extrabold">{t(`steps.${key}.title`)}</span>
                <span className="block text-xs text-muted">{t(`steps.${key}.text`)}</span>
              </span>
            </li>
          ))}
        </ol>
      </PageHero>

      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-8 px-4 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        <section className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-lift)] sm:p-8" aria-labelledby="join-who">
          <h2 id="join-who" className="text-2xl font-extrabold text-ink sm:text-3xl">
            {t("whoTitle")}
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-2">{t("who")}</p>
          <h3 className="mt-7 text-lg font-extrabold text-ink">{t("why")}</h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {(["a", "b", "c", "d"] as const).map((k) => (
              <li key={k} className="flex gap-3 rounded-2xl bg-surface-2/70 p-4 text-sm font-semibold text-ink-2">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-leaf" aria-hidden />
                {t(`perks.${k}`)}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
            <Link href="/signup" className={buttonClasses("primary", "lg", "h-auto min-h-14 w-full rounded-full px-6 py-3 text-center text-base whitespace-normal sm:w-auto sm:px-7 sm:text-lg")} data-testid="join-signup">
              <UserPlus className="size-5" /> {t("cta")} <ArrowRight className="rtl-flip size-5" />
            </Link>
            <p className="text-sm font-bold text-muted">{t("ctaHint")}</p>
          </div>
        </section>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl bg-sun-soft p-6 text-center">
            <p className="font-bold text-ink">{t("already")}</p>
            <Link href="/login" className="mt-2 inline-flex font-extrabold text-brand-600 hover:underline">
              {tn("login")}
            </Link>
          </div>
          <div className="rounded-3xl border border-line bg-surface p-6 text-center shadow-[var(--shadow-soft)]">
            <p className="font-bold text-ink">{t("contactTitle")}</p>
            <Link href="/contact" className="mt-2 inline-flex items-center gap-1.5 font-extrabold text-brand-600 hover:underline">
              <MessageCircle className="size-4" /> {t("contactCta")}
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}

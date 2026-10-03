import { useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import { CheckCircle2, ClipboardPen, PhoneCall, Sparkles, PartyPopper } from "lucide-react";
import { JoinForm } from "@/components/public/join-form";
import { PageHero } from "@/components/public/page-hero";

const STEPS = [
  { key: "one", icon: ClipboardPen, color: "#E30613" },
  { key: "two", icon: PhoneCall, color: "#1E9BD7" },
  { key: "three", icon: PartyPopper, color: "#2BB673" },
] as const;

export function Component() {
  const t = useTranslations("public.join");
  const tn = useTranslations("public.nav");
  const tf = useTranslations("public.form");
  const tm = useTranslations("public.meta.join");
  usePageTitle(tm("title"));
  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} color="#E30613" icon={<Sparkles />} crumbs={[{ href: "/", label: tn("home") }]}>
        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map(({ key, icon: Icon, color }, i) => (
            <li key={key} className="flex items-center gap-3 rounded-2xl bg-white/95 p-3 text-ink shadow-lg">
              <span className="relative grid size-11 shrink-0 place-items-center rounded-xl text-white" style={{ background: color }}>
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
        <div className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-lift)] sm:p-8">
          <p className="mb-5 text-xs font-bold text-muted">
            <span className="text-brand-600">*</span> {tf("required")}
          </p>
          <JoinForm />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl bg-sun-soft p-6">
            <h2 className="text-xl font-extrabold text-ink">{t("why")}</h2>
            <ul className="mt-4 space-y-3">
              {(["a", "b", "c", "d"] as const).map((k) => (
                <li key={k} className="flex gap-3 text-sm font-semibold text-ink-2">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-leaf" aria-hidden />
                  {t(`perks.${k}`)}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-line bg-surface p-6 text-center shadow-[var(--shadow-soft)]">
            <p className="font-bold text-ink">{t("already")}</p>
            <Link href="/login" className="mt-2 inline-flex font-extrabold text-brand-600 hover:underline">
              {tn("login")}
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}

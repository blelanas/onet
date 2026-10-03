import { useTranslations } from "use-intl";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { ContactForm } from "@/components/public/contact-form";
import { PageHero } from "@/components/public/page-hero";
import { FacebookIcon, InstagramIcon, Wave } from "@/components/public/shapes";
import { useOrg } from "@/components/public/use-org";
import { usePageTitle } from "@/lib/title";

export function Component() {
  const t = useTranslations("public.contact");
  const tn = useTranslations("public.nav");
  const tm = useTranslations("public.meta.contact");
  const org = useOrg();
  usePageTitle(tm("title"));
  const items = [
    org.address && { icon: MapPin, color: "#E30613", label: t("address"), value: org.address },
    org.phone && { icon: Phone, color: "#2BB673", label: t("phone"), value: org.phone, href: `tel:${org.phone.replace(/\s/g, "")}`, ltr: true },
    org.email && { icon: Mail, color: "#1E9BD7", label: t("email"), value: org.email, href: `mailto:${org.email}`, ltr: true },
    { icon: Clock, color: "#FFB400", label: t("hours"), value: t("hoursValue") },
  ].filter(Boolean) as { icon: typeof MapPin; color: string; label: string; value: string; href?: string; ltr?: boolean }[];

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} eyebrow={tm("title")} color="#5CAE2E" icon={<MessageCircle />} crumbs={[{ href: "/", label: tn("home") }]} />
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-8 px-4 pt-8 sm:px-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:px-8">
        <aside className="space-y-4">
          <h2 className="sr-only">{t("infoTitle")}</h2>
          <ul className="space-y-3">
            {items.map(({ icon: Icon, color, label, value, href, ltr }) => (
              <li key={label} className="flex items-start gap-4 rounded-3xl border border-line bg-surface p-4 shadow-[var(--shadow-soft)]">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl text-white" style={{ background: color }}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold tracking-wide text-muted uppercase">{label}</p>
                  {href ? (
                    <a href={href} dir={ltr ? "ltr" : undefined} className="block font-bold break-words text-ink hover:text-brand-600 hover:underline">
                      {value}
                    </a>
                  ) : (
                    <p className="font-bold text-ink">{value}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {/* Stylised map card (no external tiles) */}
          <div className="relative h-48 overflow-hidden rounded-3xl bg-sky-soft shadow-[var(--shadow-soft)]" aria-hidden>
            <svg className="absolute inset-0 size-full" viewBox="0 0 380 190" preserveAspectRatio="xMidYMid slice">
              <rect width="380" height="190" fill="#E9F6EE" />
              <path d="M250 0 C230 60 280 110 260 190 L380 190 L380 0Z" fill="#BFE6F7" />
              <path d="M0 120 L250 90 M40 0 L120 190 M0 40 L240 60 M170 0 L190 190" stroke="#fff" strokeWidth="8" />
              <path d="M0 120 L250 90" stroke="#FFD27A" strokeWidth="4" />
              <circle cx="300" cy="60" r="4" fill="#1E9BD7" />
              <circle cx="320" cy="140" r="3" fill="#1E9BD7" />
            </svg>
            <div className="absolute start-[38%] top-[30%] flex flex-col items-center">
              <span className="grid size-11 animate-[var(--animate-float)] place-items-center rounded-full bg-brand-600 text-white shadow-[var(--shadow-brand)] ring-4 ring-white">
                <MapPin className="size-5" />
              </span>
            </div>
            <p className="absolute inset-x-3 bottom-3 rounded-xl bg-white/90 px-3 py-2 text-sm font-extrabold text-ink backdrop-blur">{t("mapLabel")}</p>
          </div>
          {(org.facebook || org.instagram) && (
            <div className="flex items-center gap-2 rounded-3xl border border-line bg-surface p-4 shadow-[var(--shadow-soft)]">
              <p className="me-auto font-extrabold text-ink">{t("follow")}</p>
              {org.facebook && (
                <a href={org.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="grid size-10 place-items-center rounded-full bg-sky-soft text-sky hover:bg-sky hover:text-white">
                  <FacebookIcon className="size-[18px]" />
                </a>
              )}
              {org.instagram && (
                <a href={org.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="grid size-10 place-items-center rounded-full bg-coral-soft text-coral hover:bg-coral hover:text-white">
                  <InstagramIcon className="size-[18px]" />
                </a>
              )}
            </div>
          )}
        </aside>
        <section aria-labelledby="form-title" className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-lift)] sm:p-8">
          <Wave className="absolute inset-x-0 top-0 h-3 w-full rotate-180 text-leaf/40" />
          <h2 id="form-title" className="mb-6 text-2xl font-extrabold text-ink">
            {t("formTitle")}
          </h2>
          <ContactForm />
        </section>
      </div>
    </>
  );
}

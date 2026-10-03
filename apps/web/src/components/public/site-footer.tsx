import { useLocale, useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import type { OrgProfile } from "@api/modules/public/queries";
import { PUBLIC_NAV } from "./nav-items";
import { FacebookIcon, InstagramIcon, Wave } from "./shapes";

export function SiteFooter({ org }: { org: OrgProfile }) {
  const t = useTranslations("public.footer");
  const tn = useTranslations("public.nav");
  const locale = useLocale();
  const year = new Date().getFullYear();
  const fullName = locale === "ar" ? (org.fullNameAr ?? org.fullName) : org.fullName;
  const linkCls = "inline-flex rounded-md py-1 text-white/75 transition hover:text-white hover:underline underline-offset-4";

  return (
    <footer className="relative mt-20 text-white">
      <Wave className="block h-10 w-full text-ink sm:h-14" />
      <div className="relative overflow-hidden bg-ink">
        <div className="bg-confetti pointer-events-none absolute inset-0 opacity-25" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pt-8 pb-10 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr] lg:px-8">
          <div>
            <Logo href="/" light />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">{t("tagline", { year: org.foundedYear ?? 1985 })}</p>
            {(org.facebook || org.instagram) && (
              <div className="mt-5 flex gap-2" aria-label={t("social")}>
                {org.facebook && (
                  <a href={org.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="grid size-10 place-items-center rounded-full bg-white/10 transition hover:bg-[#1E9BD7]">
                    <FacebookIcon className="size-[18px]" />
                  </a>
                )}
                {org.instagram && (
                  <a href={org.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="grid size-10 place-items-center rounded-full bg-white/10 transition hover:bg-[#E8457C]">
                    <InstagramIcon className="size-[18px]" />
                  </a>
                )}
              </div>
            )}
          </div>

          <nav aria-label={t("discover")}>
            <h2 className="mb-3 text-sm font-extrabold tracking-wider text-sun uppercase">{t("discover")}</h2>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm md:grid-cols-1">
              {PUBLIC_NAV.filter((i) => i.key !== "contact").map((i) => (
                <li key={i.key}>
                  <Link href={i.href} className={linkCls}>
                    {tn(i.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={t("participate")}>
            <h2 className="mb-3 text-sm font-extrabold tracking-wider text-sun uppercase">{t("participate")}</h2>
            <ul className="space-y-0.5 text-sm">
              <li>
                <Link href="/join" className={linkCls}>
                  {tn("join")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className={linkCls}>
                  {tn("contact")}
                </Link>
              </li>
              <li>
                <Link href="/login" className={linkCls}>
                  {tn("login")}
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className="mb-3 text-sm font-extrabold tracking-wider text-sun uppercase">{t("contact")}</h2>
            <address className="space-y-3 text-sm text-white/80 not-italic">
              {org.address && (
                <p className="flex gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden />
                  <span>{org.address}</span>
                </p>
              )}
              {org.phone && (
                <p className="flex gap-3">
                  <Phone className="mt-0.5 size-4 shrink-0 text-leaf" aria-hidden />
                  <a href={`tel:${org.phone.replace(/\s/g, "")}`} dir="ltr" className="hover:text-white hover:underline">
                    {org.phone}
                  </a>
                </p>
              )}
              {org.email && (
                <p className="flex gap-3">
                  <Mail className="mt-0.5 size-4 shrink-0 text-sky" aria-hidden />
                  <a href={`mailto:${org.email}`} dir="ltr" className="break-all hover:text-white hover:underline">
                    {org.email}
                  </a>
                </p>
              )}
            </address>
          </div>
        </div>
        <div className="relative border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>
              {t("rights", { year, name: org.name })}
              {fullName && <span className="block sm:inline sm:before:mx-2 sm:before:content-['·']">{fullName}</span>}
            </p>
            <p className="flex items-center gap-2">
              <span className="flex gap-1" aria-hidden>
                {["#E30613", "#FFB400", "#1E9BD7", "#2BB673", "#7C4DFF"].map((c) => (
                  <span key={c} className="size-2 rounded-full" style={{ background: c }} />
                ))}
              </span>
              {t("made")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Bus, FlaskConical, Music, Palette, PartyPopper, Sparkles, Trophy } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Star, Wave } from "./shapes";

const TILES = [
  { key: "sport", icon: Trophy, color: "#1E9BD7", pos: "top-[4%] start-[6%]", rot: "-rotate-6", delay: "0s" },
  { key: "music", icon: Music, color: "#7C4DFF", pos: "top-0 end-[8%]", rot: "rotate-6", delay: ".6s" },
  { key: "science", icon: FlaskConical, color: "#2BB673", pos: "top-[40%] -start-[2%]", rot: "rotate-3", delay: "1.2s" },
  { key: "art", icon: Palette, color: "#FF6B4A", pos: "top-[38%] -end-[2%]", rot: "-rotate-3", delay: ".3s" },
  { key: "trips", icon: Bus, color: "#00A3A3", pos: "bottom-[4%] start-[10%]", rot: "rotate-6", delay: ".9s" },
  { key: "fun", icon: PartyPopper, color: "#FFB400", pos: "bottom-0 end-[12%]", rot: "-rotate-6", delay: "1.5s" },
] as const;

export async function HomeHero({ kids, foundedYear }: { kids: number; foundedYear?: number }) {
  const t = await getTranslations("public.hero");
  return (
    <section aria-labelledby="hero-title" className="relative isolate -mt-16 overflow-hidden bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 pt-16 text-white lg:-mt-[72px] lg:pt-[72px]">
      <div className="bg-confetti absolute inset-0 -z-10 opacity-70" aria-hidden />
      <div className="absolute -start-32 -bottom-40 -z-10 size-[420px] rounded-full bg-coral/30 blur-3xl" aria-hidden />
      <div className="absolute -end-24 -top-24 -z-10 size-[380px] rounded-full bg-sun/25 blur-3xl" aria-hidden />

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-10 pb-24 sm:px-6 sm:pt-14 lg:grid-cols-[1.15fr_1fr] lg:gap-6 lg:px-8 lg:pt-20 lg:pb-32">
        <div className="animate-[var(--animate-fade-up)]">
          <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/15 py-1.5 ps-1.5 pe-4 text-xs font-extrabold tracking-wide ring-1 ring-white/25 backdrop-blur sm:text-sm">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-sun text-ink">
              <Sparkles className="size-3.5" />
            </span>
            <span className="truncate">{t("eyebrow")}</span>
          </p>
          <h1 id="hero-title" className="mt-5 text-[2.6rem] leading-[1.02] font-extrabold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            {t("title")}{" "}
            <span className="text-sun underline decoration-white/70 decoration-wavy decoration-[3px] underline-offset-[14px] [text-decoration-skip-ink:none]">{t("highlight")}</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl">{t("subtitle")}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/join" className={buttonClasses("sun", "lg", "h-14 rounded-full px-7 text-lg shadow-[0_12px_30px_-10px_rgb(0_0_0/0.45)] hover:-translate-y-0.5")}>
              <Sparkles className="size-5" /> {t("ctaJoin")}
            </Link>
            <Link href="/activities" className={buttonClasses("outline", "lg", "h-14 rounded-full border-white/40 bg-white/10 px-7 text-lg text-white backdrop-blur hover:bg-white/20")}>
              {t("ctaDiscover")} <ArrowRight className="rtl-flip size-5" />
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-bold text-white/90">
            <li className="flex items-center gap-2.5">
              <span className="flex -space-x-2 rtl:space-x-reverse" aria-hidden>
                {["#FFB400", "#1E9BD7", "#2BB673", "#7C4DFF"].map((c, i) => (
                  <span key={c} className="grid size-8 place-items-center rounded-full ring-2 ring-brand-600" style={{ background: c }}>
                    <SmileFace variant={i} />
                  </span>
                ))}
              </span>
              {t("kidsCount", { count: kids })}
            </li>
            <li className="flex items-center gap-1.5">
              <Star className="size-4 text-sun" /> {t("ages")}
            </li>
            {foundedYear && (
              <li className="flex items-center gap-1.5">
                <Star className="size-4 text-sun" /> {t("since", { year: foundedYear })}
              </li>
            )}
          </ul>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[340px] sm:max-w-[440px] lg:max-w-[500px]" aria-hidden>
          <svg className="absolute inset-[12%] size-[76%] animate-[spin_60s_linear_infinite] text-white/30" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth=".6" strokeDasharray="2 3" />
          </svg>
          <div className="absolute inset-[24%] grid place-items-center rounded-full bg-white shadow-[0_30px_60px_-20px_rgb(0_0_0/0.45)]">
            <img src="/brand/onet-mark.svg" alt="" className="size-[62%] animate-[var(--animate-float)]" />
          </div>
          {TILES.map(({ key, icon: Icon, color, pos, rot, delay }) => (
            <div key={key} className={cn("absolute", pos)}>
              <div className="animate-[var(--animate-float)]" style={{ animationDelay: delay }}>
                <div className={cn("flex w-[78px] flex-col items-center gap-1 rounded-3xl p-2.5 text-white shadow-[0_16px_30px_-12px_rgb(0_0_0/0.5)] ring-4 ring-white/90 sm:w-24 sm:p-3", rot)} style={{ background: color }}>
                  <Icon className="size-7 sm:size-9" strokeWidth={2.2} />
                  <span className="text-[11px] font-extrabold sm:text-xs">{t(`tiles.${key}`)}</span>
                </div>
              </div>
            </div>
          ))}
          <Star className="absolute start-[42%] top-[6%] size-5 text-sun" />
          <Star className="absolute end-[30%] bottom-[18%] size-4 text-white" />
        </div>
      </div>
      <Wave className="absolute inset-x-0 -bottom-px h-12 w-full text-canvas sm:h-20" />
    </section>
  );
}

function SmileFace({ variant }: { variant: number }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="#221B33" strokeWidth="2" strokeLinecap="round">
      <circle cx="9" cy="10" r=".8" fill="#221B33" />
      <circle cx="15" cy="10" r=".8" fill="#221B33" />
      {variant % 2 ? <path d="M8.5 14.5c2 2 5 2 7 0" /> : <path d="M9 15c1.5 1 4.5 1 6 0" />}
    </svg>
  );
}

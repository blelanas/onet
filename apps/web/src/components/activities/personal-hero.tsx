import { useTranslations } from "use-intl";
import { Gamepad2, Music, Palette, Sparkles, Trees } from "lucide-react";
import { cn } from "@/lib/utils";

/** Friendly banner on top of the activities page for parents, kids and members. */
export function PersonalHero({ kid, parent, name, count }: { kid: boolean; parent: boolean; name: string; count: number }) {
  const t = useTranslations("activities.personal");
  return (
    <section
      className={cn("relative overflow-hidden rounded-3xl p-6 text-white shadow-[var(--shadow-lift)] sm:p-8", kid ? "bg-[linear-gradient(120deg,#7C4DFF,#E8457C_55%,#FFB400)]" : "bg-[linear-gradient(120deg,#E30613,#FF6B4A_60%,#FFB400)]")}
    >
      <div className="bg-confetti absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute end-6 bottom-6 hidden gap-3 opacity-90 lg:flex" aria-hidden>
        {[Palette, Music, Gamepad2, Trees].map((I, i) => (
          <span key={i} className="grid size-16 animate-[var(--animate-float)] place-items-center rounded-2xl bg-white/20 backdrop-blur" style={{ animationDelay: `${i * 0.6}s`, transform: `rotate(${(i - 1.5) * 8}deg)` }}>
            <I className="size-8" />
          </span>
        ))}
      </div>
      <div className="relative max-w-xl">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold backdrop-blur">
          <Sparkles className="size-3.5" /> {kid ? t("heroBadgeKid") : t("heroBadge")}
        </span>
        <h1 className="mt-3 font-display text-3xl leading-tight font-extrabold sm:text-4xl">{kid ? t("heroTitleKid", { name }) : parent ? t("heroTitleParent") : t("heroTitle")}</h1>
        <p className="mt-2 text-white/90">{kid ? t("heroTextKid", { count }) : parent ? t("heroTextParent", { count }) : t("heroText")}</p>
      </div>
    </section>
  );
}

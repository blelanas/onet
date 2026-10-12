import { useLocale, useTranslations } from "use-intl";
import type { publicBureau } from "@api/modules/public/routes";
import { assetUrl } from "@/lib/api";
import type { Loaded } from "@/lib/types";
import { cn, colorFor, initials } from "@/lib/utils";
import { Star } from "./shapes";

export type BureauMember = Loaded<typeof publicBureau>["rows"][number];

/**
 * "أعضاء المكتب المحلي" — the local bureau on the landing page: an endless, gently scrolling row of
 * round portraits (the list is rendered twice so the loop is seamless). It pauses on hover and on
 * keyboard focus, runs the other way in RTL, and becomes a static wrapped grid when the visitor
 * prefers reduced motion. Managed in Settings → Local bureau.
 */
export function BureauSection({ members, className }: { members: BureauMember[]; className?: string }) {
  const t = useTranslations("public.bureau");
  if (!members.length) return null;
  // ~6 s per portrait keeps the pace calm whatever the size of the bureau.
  const duration = `${Math.max(24, members.length * 6)}s`;
  return (
    <section aria-labelledby="bureau-title" className={cn("relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", className)} data-testid="bureau-section">
      <div className="relative isolate overflow-hidden rounded-[2rem] border border-line bg-surface py-7 shadow-[var(--shadow-lift)] sm:py-9">
        <div className="bg-confetti absolute inset-0 -z-10 opacity-50" aria-hidden />
        <Star className="absolute end-[8%] top-6 -z-10 size-5 animate-[var(--animate-float)] text-sun" />
        <div className="px-5 text-center sm:px-8">
          <p className="text-xs font-extrabold tracking-[0.16em] text-leaf uppercase">{t("eyebrow")}</p>
          <h2 id="bureau-title" className="mt-1 text-2xl leading-tight font-extrabold text-ink sm:text-3xl">
            {t("title")}
          </h2>
          <p className="mx-auto mt-1.5 max-w-xl text-sm text-muted sm:text-base">{t("subtitle")}</p>
        </div>

        {/* Animated marquee (hidden when reduced motion is preferred). */}
        <div
          className="marquee-pause mt-6 overflow-hidden focus-visible:outline-offset-[-4px] motion-reduce:hidden [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)]"
          role="region"
          aria-label={t("list")}
          tabIndex={0}
        >
          <div className="animate-marquee flex w-max" style={{ "--marquee-duration": duration } as React.CSSProperties}>
            <ul className="flex gap-4 py-3 pe-4 sm:gap-6 sm:pe-6">
              {members.map((m) => (
                <li key={m.id}>
                  <BureauCard member={m} />
                </li>
              ))}
            </ul>
            <ul className="flex gap-4 py-3 pe-4 sm:gap-6 sm:pe-6" aria-hidden>
              {members.map((m) => (
                <li key={m.id}>
                  <BureauCard member={m} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Static wrapped grid for prefers-reduced-motion. */}
        <ul className="mt-6 hidden flex-wrap justify-center gap-4 px-5 motion-reduce:flex sm:gap-6">
          {members.map((m) => (
            <li key={m.id}>
              <BureauCard member={m} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function BureauCard({ member }: { member: BureauMember }) {
  const locale = useLocale();
  const ar = locale === "ar";
  const name = ar ? (member.nameAr ?? member.name) : member.name;
  const position = ar ? (member.positionAr ?? member.position) : member.position;
  const [first, ...rest] = member.name.split(" ");
  return (
    <figure className="group flex w-36 flex-col items-center text-center transition duration-300 hover:-translate-y-1.5 hover:scale-[1.04] sm:w-44">
      <span className="rounded-full bg-gradient-to-br from-sun via-leaf to-sky p-1 shadow-[var(--shadow-soft)] transition-shadow duration-300 group-hover:shadow-[var(--shadow-lift)]">
        <span className="block size-24 overflow-hidden rounded-full bg-surface ring-4 ring-surface sm:size-28">
          {member.photoUrl ? (
            <img src={assetUrl(member.photoUrl)} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <span className="grid size-full place-items-center text-2xl font-extrabold text-white" style={{ background: colorFor(member.name) }} aria-hidden>
              {initials(first, rest.join(" ") || first)}
            </span>
          )}
        </span>
      </span>
      <figcaption className="mt-3 min-w-0">
        <span className="line-clamp-2 block text-sm leading-snug font-extrabold text-ink sm:text-base" dir="auto">
          {name}
        </span>
        <span className="mt-1 inline-block rounded-full bg-leaf-soft px-2.5 py-0.5 text-xs font-bold text-emerald-800" dir="auto">
          {position}
        </span>
      </figcaption>
    </figure>
  );
}

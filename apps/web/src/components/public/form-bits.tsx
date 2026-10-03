import { useTranslations } from "use-intl";
import { useEffect, useRef } from "react";
import { Star } from "./shapes";

/** Anti-spam honeypot: invisible to humans (and to assistive tech), bots tend to fill it. */
export function Honeypot() {
  const t = useTranslations("public.form");
  return (
    <div aria-hidden="true" className="pointer-events-none absolute top-0 size-px overflow-hidden whitespace-nowrap opacity-0 [clip:rect(0,0,0,0)]">
      <label>
        {t("honeypot")}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

/** Joyful confirmation shown after a public form was submitted. */
export function SuccessCard({ title, text, icon, actions }: { title: string; text: string; icon: React.ReactNode; actions?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const confetti = ["#E30613", "#FFB400", "#1E9BD7", "#2BB673", "#7C4DFF", "#FF6B4A", "#00A3A3", "#E8457C"];
  return (
    <div ref={ref} tabIndex={-1} role="status" className="relative animate-[var(--animate-pop)] overflow-hidden rounded-3xl bg-gradient-to-br from-leaf-soft via-surface to-sun-soft p-8 text-center outline-none sm:p-12">
      {confetti.map((c, i) => (
        <span
          key={c}
          className="absolute size-3 animate-[var(--animate-float)] rounded-sm"
          style={{ background: c, top: `${10 + ((i * 37) % 70)}%`, insetInlineStart: `${6 + ((i * 53) % 88)}%`, transform: `rotate(${i * 25}deg)`, animationDelay: `${i * 0.25}s` }}
          aria-hidden
        />
      ))}
      <Star className="absolute end-10 top-8 size-6 text-sun" />
      <div className="relative mx-auto grid size-20 place-items-center rounded-full bg-leaf text-white shadow-[0_14px_30px_-12px_rgb(43_182_115/0.8)]">{icon}</div>
      <h2 className="relative mt-5 text-3xl font-extrabold text-ink">{title}</h2>
      <p className="relative mx-auto mt-2 max-w-md text-ink-2">{text}</p>
      {actions && <div className="relative mt-7 flex flex-col justify-center gap-3 sm:flex-row">{actions}</div>}
    </div>
  );
}

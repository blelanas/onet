import { useState } from "react";
import { useTranslations } from "use-intl";
import { Check, Layers, PartyPopper, Users } from "lucide-react";
import { formatDate } from "@onet/shared";
import { cn } from "@/lib/utils";

/** Default colours offered for programmes and teams (the theme accents, no brand red). */
export const SWATCHES = ["#0F7A3E", "#2BB673", "#E8A400", "#FFB400", "#1E9BD7", "#00A3A3", "#7C4DFF", "#E8457C", "#FF6B4A", "#5C6BC0", "#8D6E63", "#455A64"];

export function SeriesKindIcon({ kind, className }: { kind: string; className?: string }) {
  const Icon = kind === "FESTIVAL" ? PartyPopper : kind === "CLUB" ? Users : Layers;
  return <Icon className={className} aria-hidden />;
}

/** Programme names in reading order: Arabic first when the interface is in Arabic. */
export function seriesNames(s: { name: string; nameAr: string | null }, locale: string) {
  if (locale === "ar") return { primary: s.nameAr || s.name, secondary: s.nameAr ? s.name : null, secondaryIsAr: false };
  return { primary: s.name, secondary: s.nameAr, secondaryIsAr: true };
}

export function seriesName(s: { name: string; nameAr: string | null }, locale: string) {
  return seriesNames(s, locale).primary;
}

/** "Édition 16" for a festival, "Saison 2026-2027" for a club. */
export function useEditionLabel() {
  const t = useTranslations("events.edition");
  return (kind: string | undefined | null, e: { editionNumber: number | null; seasonYear: number | null }) =>
    kind !== "FESTIVAL" && e.seasonYear ? t("season", { from: e.seasonYear, to: e.seasonYear + 1 }) : e.editionNumber ? t("number", { n: e.editionNumber }) : e.seasonYear ? String(e.seasonYear) : "";
}

export function editionPhase(e: { startAt: Date; endAt: Date }, now = new Date()): "current" | "upcoming" | "past" {
  return e.endAt < now ? "past" : e.startAt > now ? "upcoming" : "current";
}

export function useDateRange() {
  const t = useTranslations("events.edition");
  return (from: Date, to: Date, locale: string) => t("dates", { from: formatDate(from, locale), to: formatDate(to, locale) });
}

export function PhaseBadge({ e, className }: { e: { startAt: Date; endAt: Date }; className?: string }) {
  const t = useTranslations("events.edition.status");
  const phase = editionPhase(e);
  const cls = phase === "current" ? "bg-leaf-soft text-emerald-700" : phase === "upcoming" ? "bg-sky-soft text-sky-700" : "bg-surface-2 text-ink-2";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap", cls, className)}>
      {phase === "current" && <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden />}
      {t(phase)}
    </span>
  );
}

/** Swatches + free colour, posted as a hidden "#rrggbb" input. */
export function ColorPicker({ name, defaultValue, label }: { name: string; defaultValue?: string | null; label: string }) {
  const [value, setValue] = useState((defaultValue ?? SWATCHES[0]).toUpperCase());
  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-1.5 block text-sm font-bold text-ink-2">{label}</legend>
      <input type="hidden" name={name} value={value} />
      {/* Toggle buttons (aria-pressed) in a labelled group: each swatch is a plain tab stop picked with Enter/Space. */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={label}>
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={value === c}
            aria-label={c}
            onClick={() => setValue(c)}
            className={cn("grid size-8 place-items-center rounded-full ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none", value === c && "ring-2 ring-ink/70")}
            style={{ background: c }}
          >
            {value === c && <Check className="size-4 text-white" aria-hidden />}
          </button>
        ))}
        <label className="relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-dashed border-line" title={value}>
          <span className="sr-only">{label}</span>
          <span className="size-5 rounded-full" style={{ background: value }} aria-hidden />
          <input type="color" value={value.toLowerCase()} onChange={(e) => setValue(e.target.value.toUpperCase())} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
      </div>
    </fieldset>
  );
}

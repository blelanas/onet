import { getLocale, getTranslations } from "next-intl/server";
import { Music, PartyPopper, Rocket, Sparkles, Star, Sun } from "lucide-react";
import { relativeTime } from "@/lib/dates";
import { EmptyState } from "@/components/ui/empty-state";
import type { AnnouncementRow } from "./announcement-card";

const THEMES = [
  { from: "#FFB400", to: "#FF6B4A", icon: Sun },
  { from: "#1E9BD7", to: "#7C4DFF", icon: Rocket },
  { from: "#2BB673", to: "#00A3A3", icon: Star },
  { from: "#E8457C", to: "#FF6B4A", icon: PartyPopper },
  { from: "#7C4DFF", to: "#E8457C", icon: Music },
];

/** Colourful, friendly announcement feed for kids. */
export async function KidAnnouncements({ rows }: { rows: AnnouncementRow[] }) {
  const t = await getTranslations("communication.announcements");
  const locale = await getLocale();
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sun via-coral to-brand-500 p-6 text-white shadow-[var(--shadow-lift)] sm:p-8">
        <div className="bg-confetti absolute inset-0 opacity-60" aria-hidden />
        <Sparkles className="absolute end-6 top-6 size-16 rotate-12 opacity-30 animate-[var(--animate-float)]" aria-hidden />
        <div className="relative">
          <h1 className="text-3xl font-extrabold drop-shadow-sm sm:text-4xl">{t("kidTitle")}</h1>
          <p className="mt-2 max-w-md text-base font-semibold text-white/90">{t("kidSubtitle")}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="card">
          <EmptyState title={t("empty.title")} description={t("empty.kid")} />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {rows.map((a, i) => {
            const th = THEMES[i % THEMES.length];
            const Icon = th.icon;
            return (
              <li
                key={a.id}
                id={`a-${a.id}`}
                className="relative animate-[var(--animate-pop)] overflow-hidden rounded-3xl p-5 text-white shadow-[var(--shadow-soft)]"
                style={{ background: `linear-gradient(135deg, ${th.from}, ${th.to})`, animationDelay: `${i * 60}ms` }}
              >
                <svg className="pointer-events-none absolute -end-8 -bottom-10 size-40 opacity-15" viewBox="0 0 100 100" aria-hidden>
                  <circle cx="50" cy="50" r="50" fill="#fff" />
                </svg>
                <div className="relative flex items-start gap-3">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/25 backdrop-blur">
                    <Icon className="size-6" />
                  </span>
                  <div className="min-w-0">
                    {a.isPinned && <span className="mb-1 inline-block rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-extrabold">★ {t("pinned")}</span>}
                    <h2 className="text-xl leading-snug font-extrabold">{a.title}</h2>
                  </div>
                </div>
                <p className="relative mt-3 text-[15px] leading-relaxed font-semibold whitespace-pre-line text-white/95">{a.body}</p>
                <p className="relative mt-4 text-xs font-bold text-white/80">{relativeTime(a.publishedAt, locale)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import { useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { usePathname } from "@/lib/router";
import { cn } from "@/lib/utils";
import { SETTINGS_SECTIONS } from "./sections";

/** Vertical menu on desktop, horizontal scrolling pills on phones. */
export function SettingsNav({ keys, badges = {} }: { keys: string[]; badges?: Record<string, number> }) {
  const t = useTranslations("settings");
  const pathname = usePathname();
  const items = SETTINGS_SECTIONS.filter((s) => keys.includes(s.key));
  return (
    <nav aria-label={t("nav.label")} className="min-w-0 lg:sticky lg:top-24">
      <ul className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:rounded-2xl lg:border lg:border-line lg:bg-surface lg:p-2 lg:shadow-[var(--shadow-soft)]">
        {items.map((s) => {
          const active = pathname.startsWith(s.href);
          const Icon = s.icon;
          return (
            <li key={s.key} className="shrink-0">
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-full border px-3 py-2 text-sm font-bold transition lg:rounded-xl lg:border-transparent lg:px-2.5",
                  active ? "border-transparent bg-ink text-white lg:bg-brand-50 lg:text-brand-700" : "border-line bg-surface text-ink-2 hover:text-ink lg:bg-transparent lg:hover:bg-surface-2",
                )}
              >
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg lg:size-9 lg:rounded-xl", active && "max-lg:bg-white/15")} style={active ? undefined : { background: `${s.color}1A`, color: s.color }}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 lg:flex-1">
                  <span className="block truncate">{t(`nav.${s.key}`)}</span>
                  <span className={cn("hidden truncate text-[11px] font-semibold lg:block", active ? "text-brand-600/80" : "text-muted")}>{t(`navHints.${s.key}`)}</span>
                </span>
                {!!badges[s.key] && <span className="rounded-full bg-brand-600 px-1.5 text-[11px] font-extrabold text-white">{badges[s.key]}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

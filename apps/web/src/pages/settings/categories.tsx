import { useTranslations } from "use-intl";
import { Bus, Lock, PartyPopper, Receipt, Sparkles } from "lucide-react";
import { ACTIVITY_CATEGORIES, CATEGORY_COLORS, EVENT_CATEGORIES, EXPENSE_CATEGORIES, TRIP_CATEGORIES } from "@onet/shared";
import { colorFor } from "@/lib/utils";
import { usePageTitle } from "@/lib/title";
import { RequirePerm } from "@/components/states/guards";
import { Badge } from "@/components/ui/badge";
import { SettingsCard } from "@/components/settings/settings-card";

/** /dashboard/settings/categories — read-only overview of the built-in categories. */
export function Component() {
  const tn = useTranslations("settings.nav");
  usePageTitle(tn("categories"));
  return (
    <RequirePerm perm="settings.manage">
      <CategoriesSettings />
    </RequirePerm>
  );
}

function CategoriesSettings() {
  const t = useTranslations("settings.categories");
  const tc = useTranslations("common");
  const groups = [
    { key: "activities", icon: Sparkles, values: ACTIVITY_CATEGORIES, enumKey: "activityCategory" },
    { key: "events", icon: PartyPopper, values: EVENT_CATEGORIES, enumKey: "eventCategory" },
    { key: "trips", icon: Bus, values: TRIP_CATEGORIES, enumKey: "tripCategory" },
    { key: "expenses", icon: Receipt, values: EXPENSE_CATEGORIES, enumKey: "expenseCategory" },
  ] as const;
  return (
    <SettingsCard
      title={t("title")}
      description={t("intro")}
      action={
        <Badge tone="neutral">
          <Lock className="size-3" /> {t("readOnly")}
        </Badge>
      }
    >
      <div className="space-y-6">
        {groups.map((g) => {
          const Icon = g.icon;
          return (
            <section key={g.key}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-ink">
                <Icon className="size-4 text-brand-600" /> {t(g.key)}
                <span className="text-xs font-bold text-muted">({g.values.length})</span>
              </h3>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                {g.values.map((v) => {
                  const color = CATEGORY_COLORS[v] ?? colorFor(v);
                  return (
                    <li key={v} className="relative overflow-hidden rounded-2xl p-3 text-white shadow-[var(--shadow-soft)]" style={{ background: `linear-gradient(135deg, ${color}, ${color}C0)` }}>
                      <svg className="pointer-events-none absolute -end-4 -top-4 size-16 opacity-20" viewBox="0 0 100 100" aria-hidden>
                        <circle cx="50" cy="50" r="50" fill="#fff" />
                      </svg>
                      <p className="relative text-sm font-extrabold">{tc(`enums.${g.enumKey}.${v}`)}</p>
                      <p className="relative mt-1 flex items-center justify-between gap-2 font-mono text-[10px] text-white/80" dir="ltr">
                        <span className="truncate">{v}</span>
                        <span>{color}</span>
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </SettingsCard>
  );
}

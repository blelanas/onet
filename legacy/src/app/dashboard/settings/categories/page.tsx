import { getTranslations } from "next-intl/server";
import { Bus, Lock, PartyPopper, Receipt, Sparkles } from "lucide-react";
import { requirePagePermission } from "@/lib/auth/guards";
import { ACTIVITY_CATEGORIES, CATEGORY_COLORS, EVENT_CATEGORIES, EXPENSE_CATEGORIES, TRIP_CATEGORIES } from "@/lib/constants";
import { colorFor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SettingsCard } from "@/components/settings/settings-card";

export async function generateMetadata() {
  const t = await getTranslations("settings.nav");
  return { title: t("categories") };
}

export default async function CategoriesSettingsPage() {
  await requirePagePermission("settings.manage");
  const t = await getTranslations("settings.categories");
  const tc = await getTranslations("common");
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

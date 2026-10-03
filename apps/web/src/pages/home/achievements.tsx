import { useLocale, useTranslations } from "use-intl";
import { Bus, PartyPopper, Sparkles, Star, Trophy } from "lucide-react";
import type { achievementsPage } from "@api/modules/dashboard/routes";
import { formatDate } from "@onet/shared";
import { useApi } from "@/lib/query";
import { Link, useSearchParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { cn } from "@/lib/utils";
import { QueryView } from "@/components/states/page-state";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { Section } from "@/components/ui/section";
import { BadgeMedal } from "@/components/dashboard/badge-icon";
import { ChildSwitcher } from "@/components/dashboard/child-switcher";
import { levelFor, MAX_NAMED_LEVEL } from "@/components/dashboard/levels";

type Data = Loaded<typeof achievementsPage>;

export function Component() {
  const t = useTranslations("dashboard");
  usePageTitle(t("achievements.title"));
  const child = useSearchParams().get("child") ?? undefined;
  const query = useApi<Data>("/dashboard/achievements", { child });
  return <QueryView query={query}>{(who) => <Achievements who={who} />}</QueryView>;
}

function Achievements({ who }: { who: Data }) {
  const t = useTranslations("dashboard");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const crumbs = [{ label: tn("items.dashboard"), href: "/dashboard" }, ...(who.viewingChild ? [{ label: tn("items.myChildren"), href: "/dashboard/my-children" }] : []), { label: t("achievements.title") }];

  if (!who.data)
    return (
      <>
        <PageHeader title={t("achievements.title")} breadcrumbs={crumbs} icon={<Trophy className="size-6" />} />
        <div className="card">
          <EmptyState title={t("parent.noChildren")} description={t("parent.noChildrenHint")} />
        </div>
      </>
    );

  const { member, badges, history } = who.data;
  const lv = levelFor(member.points);
  const earnedIds = new Set(badges.earned.map((b) => b.badge.id));
  const locked = badges.all.filter((b) => !earnedIds.has(b.id));
  const levels = Array.from({ length: MAX_NAMED_LEVEL }, (_, i) => i + 1);

  return (
    <>
      <PageHeader
        title={who.viewingChild ? t("achievements.titleChild", { name: member.firstName }) : t("achievements.title")}
        description={t("achievements.description")}
        breadcrumbs={crumbs}
        icon={<Trophy className="size-6" />}
        actions={who.viewingChild ? <ChildSwitcher kids={who.kids} selectedId={member.id} basePath="/dashboard/achievements" /> : undefined}
      />

      {/* Level hero */}
      <section className="relative isolate mb-6 overflow-hidden rounded-3xl p-5 text-white shadow-[var(--shadow-lift)] sm:p-7" style={{ background: `linear-gradient(135deg, ${lv.color}, ${lv.color}CC 55%, #FFB400)` }}>
        <div className="bg-confetti absolute inset-0 -z-10 opacity-80" aria-hidden />
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <Avatar firstName={member.firstName} lastName={member.lastName} src={member.photoUrl} size="xl" ring />
            <div>
              <p className="text-xs font-extrabold tracking-wide text-white/85 uppercase">{t("kid.level", { level: lv.level })}</p>
              <p className="font-display text-3xl font-extrabold">{t(`levels.names.${lv.nameKey}`)}</p>
              <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 font-display text-lg font-extrabold">
                <Star className="size-4" fill="currentColor" /> {member.points} {t("kid.points")}
              </p>
            </div>
          </div>
          <div className="flex-1 md:ps-6">
            <Progress value={lv.pct} color="#fff" className="h-3 bg-white/30" label={t("achievements.progress")} />
            <p className="mt-2 text-sm font-bold text-white/90">{lv.level >= MAX_NAMED_LEVEL ? t("achievements.levelMax") : t("kid.toNext", { count: lv.toNext, level: lv.level + 1 })}</p>
            <ol className="mt-4 flex gap-1.5" aria-label={t("achievements.progress")}>
              {levels.map((n) => (
                <li key={n} className={cn("flex-1 rounded-xl px-1 py-1.5 text-center text-[10px] leading-tight font-extrabold sm:text-xs", n <= lv.level ? "bg-white text-ink" : "bg-white/20 text-white/80")} title={t(`levels.names.${n}`)}>
                  {n}
                  <span className="hidden sm:block">{t(`levels.names.${n}`)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Section title={`${t("achievements.earned")} · ${badges.earned.length}/${badges.all.length}`}>
            {badges.earned.length ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {badges.earned.map((b) => (
                  <li key={b.badge.id} className="flex animate-[var(--animate-pop)] flex-col items-center gap-2 rounded-2xl p-4 text-center" style={{ background: `${b.badge.color}12` }}>
                    <BadgeMedal icon={b.badge.icon} color={b.badge.color} size="lg" />
                    <p className="font-bold text-ink">{b.badge.name}</p>
                    {b.badge.description && <p className="text-xs text-muted">{b.badge.description}</p>}
                    <p className="text-[11px] font-bold" style={{ color: b.badge.color }}>
                      {t("achievements.earnedOn", { date: formatDate(b.awardedAt, locale) })}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact title={t("kid.noBadges")} icon={<Sparkles className="size-4" />} />
            )}
          </Section>
          <Section title={`${t("achievements.locked")} · ${locked.length}`}>
            {locked.length ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {locked.map((b) => (
                  <li key={b.id} className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line p-4 text-center">
                    <BadgeMedal icon={b.icon} color={b.color} size="lg" locked />
                    <p className="font-bold text-ink-2">{b.name}</p>
                    {b.description && <p className="text-xs text-muted">{b.description}</p>}
                    <p className="text-[11px] font-bold text-muted">{t("achievements.worth", { count: b.points })}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl bg-sun-soft px-4 py-6 text-center font-bold text-amber-800">{t("achievements.allEarned")}</p>
            )}
          </Section>
        </div>
        <Section title={t("achievements.history")}>
          {history.length ? (
            <ol className="relative space-y-4 before:absolute before:inset-y-2 before:start-5 before:w-0.5 before:rounded-full before:bg-line">
              {history.map((h) => {
                const body = (
                  <>
                    <span className="text-xs font-bold text-muted">{formatDate(h.at, locale)}</span>
                    <span className="block text-sm font-bold text-ink">
                      {h.kind === "badge" ? t("achievements.badge", { name: h.title }) : h.kind === "trip" ? t("achievements.trip", { title: h.title }) : t("achievements.attended", { title: h.title })}
                    </span>
                    {h.points ? <span className="text-xs font-extrabold text-amber-700">{t("achievements.worth", { count: h.points })}</span> : null}
                  </>
                );
                return (
                  <li key={h.id} className="relative flex gap-3">
                    {h.kind === "badge" ? (
                      <BadgeMedal icon={h.icon ?? "award"} color={h.color} size="sm" className="ring-4 ring-surface" />
                    ) : (
                      <span className="grid size-10 shrink-0 place-items-center rounded-full text-white ring-4 ring-surface" style={{ background: h.color }}>
                        {h.kind === "trip" ? <Bus className="size-5" /> : <PartyPopper className="size-5" />}
                      </span>
                    )}
                    {h.href ? (
                      <Link href={h.href} className="min-w-0 flex-1 hover:text-brand-700">
                        {body}
                      </Link>
                    ) : (
                      <div className="min-w-0 flex-1">{body}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="py-6 text-center text-sm text-muted">{t("achievements.noHistory")}</p>
          )}
        </Section>
      </div>
    </>
  );
}

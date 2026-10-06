import { useLocale, useTranslations } from "use-intl";
import { ArrowRight, BookOpen, Bus, Gamepad2, Mic2, Music, PartyPopper, Receipt, Search, Shapes, Sparkles, Users, type LucideIcon } from "lucide-react";
import type { searchPage } from "@api/modules/search/routes";
import { formatDate, formatMoney } from "@onet/shared";
import { useApi } from "@/lib/query";
import { Link, useSearchParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { cn } from "@/lib/utils";
import { QueryView } from "@/components/states/page-state";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { SearchInput } from "@/components/dashboard/search-input";

const ICONS: Record<SearchSection, { icon: LucideIcon; color: string }> = {
  members: { icon: Users, color: "#7C4DFF" },
  groups: { icon: Shapes, color: "#FFB400" },
  activities: { icon: Sparkles, color: "#2BB673" },
  events: { icon: PartyPopper, color: "#E8457C" },
  trips: { icon: Bus, color: "#1E9BD7" },
  songs: { icon: Music, color: "#E30613" },
  games: { icon: Gamepad2, color: "#FF6B4A" },
  conferences: { icon: Mic2, color: "#00A3A3" },
  resources: { icon: BookOpen, color: "#5CAE2E" },
  invoices: { icon: Receipt, color: "#4a4360" },
};

/** Wraps every occurrence of the query terms in <mark> (case/accent-insensitive). */
function Highlight({ text, q }: { text: string; q: string }) {
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const terms = q.split(/\s+/).filter((x) => x.length >= 1).map(norm);
  if (!terms.length) return <>{text}</>;
  // Normalising may change length (accents are separate code points): map per character.
  const chars = [...text];
  const flat = chars.map((c) => norm(c));
  const joined = flat.join("");
  const marks = new Array(chars.length).fill(false);
  for (const term of terms) {
    let from = 0;
    while (term && (from = joined.indexOf(term, from)) !== -1) {
      let pos = 0;
      for (let i = 0; i < chars.length; i++) {
        const len = flat[i].length;
        if (pos + len > from && pos < from + term.length) marks[i] = true;
        pos += len;
      }
      from += term.length;
    }
  }
  const out: React.ReactNode[] = [];
  let buf = "";
  let on = false;
  chars.forEach((c, i) => {
    if (marks[i] !== on) {
      if (buf) out.push(on ? <mark key={i} className="rounded-sm bg-sun/40 text-ink">{buf}</mark> : buf);
      buf = "";
      on = marks[i];
    }
    buf += c;
  });
  if (buf) out.push(on ? <mark key="end" className="rounded-sm bg-sun/40 text-ink">{buf}</mark> : buf);
  return <>{out}</>;
}

type Data = Loaded<typeof searchPage>;
type SearchHit = Data["results"][number]["hits"][number];
type SearchSection = Data["allowed"][number];

export function Component() {
  const t = useTranslations("search");
  const tn = useTranslations("nav");
  usePageTitle(t("title"));
  const sp = useSearchParams();
  const q = (sp.get("q") ?? "").trim().slice(0, 80);
  const query = useApi<Data>("/search", { q, type: sp.get("type") ?? undefined });
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title") }]} />
      <div className="sticky top-16 z-20 -mx-4 mb-5 bg-canvas/90 px-4 py-2 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <SearchInput defaultValue={q} pending={query.isFetching} />
      </div>
      <QueryView query={query}>{(data) => <Results data={data} />}</QueryView>
    </>
  );
}

function Results({ data }: { data: Data }) {
  const t = useTranslations("search");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { q, ready, allowed, results, allCounts } = data;
  const only = data.only ?? undefined;
  const total = results.reduce((s, r) => s + r.count, 0);
  const grandTotal = allCounts.reduce((s, r) => s + r.count, 0);
  const href = (type?: string) => `/dashboard/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ""}`;

  const renderHit = (h: SearchHit, section: SearchSection) => (
    <li key={h.id}>
      <Link href={h.href} className="group flex items-center gap-3 rounded-2xl p-2.5 transition hover:bg-surface-2/70">
        {h.avatar ? (
          <Avatar firstName={h.avatar.firstName} lastName={h.avatar.lastName} src={h.avatar.photoUrl} />
        ) : (
          <span className="grid size-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: h.color ?? ICONS[section].color }}>
            {(() => {
              const I = ICONS[section].icon;
              return <I className="size-5" />;
            })()}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-ink group-hover:text-brand-700">
            <Highlight text={h.title} q={q} />
          </span>
          {(h.subtitle || h.date) && (
            <span className="block truncate text-xs text-muted">
              {h.date && formatDate(h.date, locale)}
              {h.date && h.subtitle && " · "}
              {h.subtitle && <Highlight text={h.subtitle} q={q} />}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {h.amount != null && <span className="hidden text-sm font-bold text-ink tabular-nums sm:inline">{formatMoney(h.amount, locale)}</span>}
          {h.status && <StatusBadge status={h.status} />}
          {h.tag && (
            <Badge color={h.color} className="hidden sm:inline-flex">
              {tc(h.tag)}
            </Badge>
          )}
        </span>
      </Link>
    </li>
  );

  return (
    <>
      {!ready ? (
        <div className="card">
          <EmptyState
            title={t("hintTitle")}
            description={t("hint")}
            icon={<Search className="size-4" />}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {allowed.slice(0, 6).map((s) => {
                  const I = ICONS[s].icon;
                  return (
                    <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-bold text-ink-2">
                      <I className="size-3.5" style={{ color: ICONS[s].color }} /> {t(`sections.${s}`)}
                    </span>
                  );
                })}
              </div>
            }
          />
        </div>
      ) : grandTotal === 0 ? (
        <div className="card">
          <EmptyState title={t("emptyTitle", { q })} description={t("emptyHint")} icon={<Search className="size-4" />} />
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm font-semibold text-muted" aria-live="polite">
            {t("results", { count: grandTotal, q })}
          </p>
          <nav className="scrollbar-none -mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1" aria-label={t("title")}>
            <Link href={href()} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-bold transition", !only ? "border-transparent bg-ink text-white" : "border-line bg-surface text-ink-2 hover:border-brand-200")}>
              {t("all")} <span className="opacity-70">{grandTotal}</span>
            </Link>
            {allCounts
              .filter((r) => r.count > 0)
              .map((r) => (
                <Link
                  key={r.section}
                  href={href(r.section)}
                  aria-current={only === r.section ? "page" : undefined}
                  className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-bold transition", only === r.section ? "border-transparent text-white" : "border-line bg-surface text-ink-2 hover:border-brand-200")}
                  style={only === r.section ? { background: ICONS[r.section].color } : undefined}
                >
                  {t(`sections.${r.section}`)} <span className="opacity-70">{r.count}</span>
                </Link>
              ))}
          </nav>
          <div className={cn("grid grid-cols-1 gap-5", !only && "lg:grid-cols-2")}>
            {results
              .filter((r) => r.count > 0)
              .map((r) => {
                const I = ICONS[r.section].icon;
                return (
                  <section key={r.section} className="card p-4 sm:p-5">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
                        <span className="grid size-8 place-items-center rounded-xl" style={{ background: `${ICONS[r.section].color}1A`, color: ICONS[r.section].color }}>
                          <I className="size-4" />
                        </span>
                        {t(`sections.${r.section}`)}
                        <span className="rounded-full bg-surface-2 px-2 text-xs text-muted">{r.count}</span>
                      </h2>
                      {r.count > r.hits.length && (
                        <span className="text-xs font-semibold text-muted">{t("showingFirst", { shown: r.hits.length, count: r.count })}</span>
                      )}
                    </div>
                    <ul className="-mx-1 divide-y divide-line/70">{r.hits.map((h) => renderHit(h, r.section))}</ul>
                    {!only && r.count > r.hits.length && (
                      <Link href={href(r.section)} className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:text-brand-700">
                        {t("seeAll", { count: r.count })} <ArrowRight className="rtl-flip size-4" />
                      </Link>
                    )}
                  </section>
                );
              })}
          </div>
          {only && total === 0 && <EmptyState compact title={tc("states.noResults")} />}
        </>
      )}
    </>
  );
}

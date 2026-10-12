import { useTranslations } from "use-intl";
import { LayoutGrid, List } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "@/lib/router";
import { cn } from "@/lib/utils";

/** Table / cards switch stored in the URL (?view=cards). */
export function useKidsView() {
  return useSearchParams().get("view") === "cards" ? "cards" : "table";
}

export function ViewToggle() {
  const t = useTranslations("kids.view");
  const view = useKidsView();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const go = (v: "table" | "cards") => {
    const sp = new URLSearchParams(params.toString());
    if (v === "cards") sp.set("view", "cards");
    else sp.delete("view");
    const qs = sp.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };
  const btn = (active: boolean) => cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-bold transition", active ? "bg-surface text-brand-700 shadow-[var(--shadow-soft)]" : "text-muted hover:text-ink");
  return (
    <div className="inline-flex shrink-0 gap-1 rounded-xl bg-surface-2 p-1" role="radiogroup" aria-label={t("label")}>
      <button type="button" role="radio" aria-checked={view === "table"} className={btn(view === "table")} onClick={() => go("table")}>
        <List className="size-4" /> {t("table")}
      </button>
      <button type="button" role="radio" aria-checked={view === "cards"} className={btn(view === "cards")} onClick={() => go("cards")}>
        <LayoutGrid className="size-4" /> {t("cards")}
      </button>
    </div>
  );
}

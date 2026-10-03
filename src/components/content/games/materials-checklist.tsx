"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Interactive "ready?" checklist for the game's materials (local state only). */
export function MaterialsChecklist({ items, color }: { items: string[]; color: string }) {
  const t = useTranslations("content.games");
  const [done, setDone] = useState<boolean[]>(() => items.map(() => false));
  const count = done.filter(Boolean).length;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-muted">{t("materialsReady", { done: count, total: items.length })}</span>
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2" dir="ltr">
          <div className="h-full rounded-full transition-all" style={{ width: `${(count / items.length) * 100}%`, background: color }} />
        </div>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i}>
            <label className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition", done[i] ? "border-transparent bg-leaf-soft" : "border-line hover:bg-surface-2")}>
              <input type="checkbox" className="sr-only" checked={done[i]} onChange={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))} />
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-lg border-2 transition", done[i] ? "border-leaf bg-leaf text-white" : "border-line bg-surface")} aria-hidden>
                {done[i] && <Check className="size-4" strokeWidth={3} />}
              </span>
              <span className={cn("text-sm font-semibold", done[i] ? "text-emerald-800 line-through decoration-2" : "text-ink")}>{item}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

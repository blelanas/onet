import { useTranslations } from "use-intl";
import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { ROLE_KEYS } from "@onet/shared";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { inputClasses } from "@/components/ui/input";
import type { ContactOption } from "./compose-form";

const KIND_ORDER = ["MEMBER", "MONITOR", "STAFF", "PARENT", "OTHER"] as const;

/**
 * Multi-select over the user's contacts: search box + checkable list grouped by kind.
 * Search matches names and, like ComposeForm, the children linking a parent/monitor (`via`).
 * With `max`, nobody more can be ticked once that many are selected (a short hint says why).
 */
export function PeoplePicker({ contacts, selected, onToggle, max, className }: { contacts: ContactOption[]; selected: Set<string>; onToggle: (id: string) => void; max?: number; className?: string }) {
  const t = useTranslations("communication.messages");
  const tc = useTranslations("common");
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle ? contacts.filter((c) => c.name.toLowerCase().includes(needle) || c.via.some((v) => v.toLowerCase().includes(needle))) : contacts;
    return KIND_ORDER.map((k) => ({ kind: k, items: list.filter((c) => c.kind === k) })).filter((g) => g.items.length);
  }, [contacts, q]);

  const roleLabels = (roles: string[]) =>
    roles
      .filter((r) => (ROLE_KEYS as readonly string[]).includes(r))
      .map((r) => tc(`roles.${r}`))
      .join(" · ");

  const full = max != null && selected.size >= max;

  if (!contacts.length) return <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">{t("groups.noContacts")}</p>;

  return (
    <div className={cn("rounded-2xl border border-line", className)}>
      <div className="relative border-b border-line p-2">
        <Search className="pointer-events-none absolute start-5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("groups.searchPeople")} aria-label={t("groups.searchPeople")} className={cn(inputClasses, "border-0 ps-10 shadow-none focus:ring-0")} />
      </div>
      <p className={cn("border-b border-line bg-sun-soft px-3 py-2 text-xs font-bold text-amber-800", !full && "sr-only")} aria-live="polite">
        {full ? t("groups.limit", { max }) : ""}
      </p>
      <div className="max-h-64 overflow-y-auto p-1.5" role="group" aria-label={t("groups.people")}>
        {groups.length === 0 && <p className="p-4 text-center text-sm text-muted">{t("compose.noMatch")}</p>}
        {groups.map((g) => (
          <div key={g.kind} className="mb-1">
            <p className="px-2.5 pt-2 pb-1 text-[11px] font-extrabold tracking-wide text-muted uppercase">{t(`kinds.${g.kind}`)}</p>
            {g.items.map((c) => {
              const on = selected.has(c.id);
              const locked = full && !on;
              return (
                <label key={c.id} className={cn("flex w-full items-center gap-3 rounded-xl p-2 text-start transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-300", on ? "cursor-pointer bg-brand-50" : locked ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-surface-2")}>
                  <input type="checkbox" className="sr-only" checked={on} disabled={locked} onChange={() => onToggle(c.id)} />
                  <Avatar name={c.name} src={c.avatarUrl} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink">{c.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {roleLabels(c.roles)}
                      {c.via.length > 0 && ` · ${t("via", { names: c.via.join(", ") })}`}
                    </span>
                  </span>
                  <span className={cn("grid size-5 shrink-0 place-items-center rounded-md border transition", on ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-surface")} aria-hidden>
                    {on && <Check className="size-3.5" />}
                  </span>
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

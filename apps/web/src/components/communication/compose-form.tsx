import { useTranslations } from "use-intl";
import { useMemo, useState } from "react";
import { Info, Search, SendHorizontal } from "lucide-react";
import { startConversation } from "@/api/communication";
import { ActionForm } from "@/components/ui/action-form";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Textarea, inputClasses } from "@/components/ui/input";
import { ROLE_KEYS } from "@onet/shared";
import { cn } from "@/lib/utils";

export type ContactOption = { id: string; name: string; avatarUrl: string | null; roles: string[]; kind: "STAFF" | "MONITOR" | "PARENT" | "OTHER"; via: string[] };

const KIND_ORDER = ["MONITOR", "PARENT", "STAFF", "OTHER"] as const;

export function ComposeForm({ contacts, initialTo }: { contacts: ContactOption[]; initialTo?: string }) {
  const t = useTranslations("communication.messages");
  const tc = useTranslations("common");
  const [to, setTo] = useState<string | undefined>(contacts.some((c) => c.id === initialTo) ? initialTo : undefined);
  const [q, setQ] = useState("");
  const selected = contacts.find((c) => c.id === to);

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

  return (
    <ActionForm action={startConversation} successMessage="toast.sent" redirectTo={(d) => `/dashboard/messages?c=${(d as { id: string }).id}`} className="flex h-full flex-col">
      {(pending) => (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
          <h2 className="text-xl font-extrabold text-ink">{t("compose.title")}</h2>
          <input type="hidden" name="to" value={to ?? ""} />
          <div className="space-y-1.5">
            <span className="block text-sm font-bold text-ink-2">
              {t("compose.to")}
              <span className="ms-0.5 text-brand-600">*</span>
            </span>
            {selected ? (
              <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-3">
                <Avatar name={selected.name} src={selected.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{selected.name}</p>
                  <p className="truncate text-xs text-muted">{roleLabels(selected.roles)}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setTo(undefined)}>
                  {t("compose.change")}
                </Button>
              </div>
            ) : contacts.length === 0 ? (
              <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">{t("compose.noContacts")}</p>
            ) : (
              <div className="rounded-2xl border border-line">
                <div className="relative border-b border-line p-2">
                  <Search className="pointer-events-none absolute start-5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("compose.searchContacts")} aria-label={t("compose.searchContacts")} className={cn(inputClasses, "border-0 ps-10 shadow-none focus:ring-0")} />
                </div>
                <div className="max-h-72 overflow-y-auto p-1.5" role="listbox" aria-label={t("compose.choose")}>
                  {groups.length === 0 && <p className="p-4 text-center text-sm text-muted">{t("compose.noMatch")}</p>}
                  {groups.map((g) => (
                    <div key={g.kind} className="mb-1">
                      <p className="px-2.5 pt-2 pb-1 text-[11px] font-extrabold tracking-wide text-muted uppercase">{t(`kinds.${g.kind}`)}</p>
                      {g.items.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          role="option"
                          aria-selected={false}
                          onClick={() => setTo(c.id)}
                          className="flex w-full items-center gap-3 rounded-xl p-2 text-start transition hover:bg-brand-50"
                        >
                          <Avatar name={c.name} src={c.avatarUrl} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-ink">{c.name}</span>
                            <span className="block truncate text-xs text-muted">
                              {roleLabels(c.roles)}
                              {c.via.length > 0 && ` · ${t("via", { names: c.via.join(", ") })}`}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="flex items-start gap-1.5 text-xs text-muted">
              <Info className="mt-0.5 size-3.5 shrink-0" /> {t("compose.rules")}
            </p>
          </div>
          <Input name="subject" label={t("compose.subject")} hint={t("compose.subjectHint")} maxLength={160} />
          <Textarea name="body" label={t("compose.message")} required rows={5} maxLength={4000} placeholder={t("placeholder")} />
          <div className="flex justify-end">
            <Button type="submit" loading={pending} disabled={!to}>
              <SendHorizontal className="rtl-flip size-4" /> {tc("actions.send")}
            </Button>
          </div>
        </div>
      )}
    </ActionForm>
  );
}

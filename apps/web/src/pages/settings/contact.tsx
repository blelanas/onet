import { useLocale, useTranslations } from "use-intl";
import { Inbox, Mail, MailOpen, Reply, Trash2 } from "lucide-react";
import type { contactMessagesPage } from "@api/modules/settings/routes";
import { formatDateTime } from "@onet/shared";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/query";
import { useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { deleteContactMessage, setContactMessageRead } from "@/api/settings";
import { QueryView } from "@/components/states/page-state";
import { RequirePerm } from "@/components/states/guards";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { ActionButton, ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { FilterChips } from "@/components/ui/toolbar";
import { SettingsCard } from "@/components/settings/settings-card";

type Data = Loaded<typeof contactMessagesPage>;

/** /dashboard/settings/contact — messages sent from the public contact form (?status=unread|read). */
export function Component() {
  const tn = useTranslations("settings.nav");
  usePageTitle(tn("contact"));
  return (
    <RequirePerm perm="settings.manage">
      <Page />
    </RequirePerm>
  );
}

function Page() {
  const t = useTranslations("settings.contact");
  const sp = useSearchParamsObject();
  const query = useApi<Data>("/settings/contact", sp);
  return (
    <SettingsCard title={t("title")} description={t("intro")}>
      <QueryView query={query}>{(data) => <ContactMessages data={data} sp={sp} />}</QueryView>
    </SettingsCard>
  );
}

function ContactMessages({ data, sp }: { data: Data; sp: Record<string, string | undefined> }) {
  const t = useTranslations("settings.contact");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { rows, total, unread, page, pageSize } = data;

  return (
    <>
      <FilterChips
        param="status"
        allLabel={t("all")}
        className="mb-4"
        options={[
          { value: "unread", label: unread ? `${t("unread")} · ${unread}` : t("unread") },
          { value: "read", label: t("read") },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState compact title={t("empty")} icon={<Inbox className="size-4" />} />
      ) : (
        <ul className="space-y-3">
          {rows.map((m) => (
            <li key={m.id} className={cn("rounded-2xl border p-4 transition", m.isRead ? "border-line bg-surface" : "border-brand-100 bg-brand-50/40")}>
              <div className="flex items-start gap-3">
                <Avatar name={m.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className={cn("text-sm text-ink", m.isRead ? "font-bold" : "font-extrabold")}>{m.name}</span>
                    {!m.isRead && <span className="size-2 rounded-full bg-brand-600" aria-hidden />}
                    <a href={`mailto:${m.email}`} className="truncate text-xs text-muted hover:text-brand-600" dir="ltr">
                      {m.email}
                    </a>
                  </div>
                  <p className="mt-0.5 text-sm font-bold text-ink-2" dir="auto">
                    {m.subject ?? t("noSubject")}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">{formatDateTime(m.createdAt, locale)}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-ink-2" dir="auto">
                {m.body}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-1 border-t border-line pt-3">
                <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject ?? ""}`)}`} className={buttonClasses("soft", "sm")}>
                  <Reply className="rtl-flip size-4" /> {t("reply")}
                </a>
                <ActionButton action={() => setContactMessageRead(m.id, !m.isRead)} variant="ghost">
                  {m.isRead ? <Mail className="size-4" /> : <MailOpen className="size-4" />} {m.isRead ? t("markUnread") : t("markRead")}
                </ActionButton>
                <ConfirmButton action={() => deleteContactMessage(m.id)} size="icon-sm" description={t("deleteConfirm")} ariaLabel={tc("actions.delete")}>
                  <Trash2 className="size-4 text-red-600" />
                </ConfirmButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/dashboard/settings/contact" searchParams={sp} />
    </>
  );
}

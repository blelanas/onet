import { getLocale, getTranslations } from "next-intl/server";
import { Inbox, Mail, MailOpen, Reply, Trash2 } from "lucide-react";
import { requirePagePermission } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { deleteContactMessage, setContactMessageRead } from "@/server/settings/actions";
import { listContactMessages } from "@/server/settings/queries";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { ActionButton, ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, paging } from "@/components/ui/pagination";
import { FilterChips } from "@/components/ui/toolbar";
import { SettingsCard } from "@/components/settings/settings-card";

export async function generateMetadata() {
  const t = await getTranslations("settings.nav");
  return { title: t("contact") };
}

type SP = Record<string, string | string[] | undefined>;

export default async function ContactMessagesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePagePermission("settings.manage");
  const sp = await searchParams;
  const t = await getTranslations("settings.contact");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const { page, pageSize, skip, take } = paging(sp, 10);
  const { rows, total, unread } = await listContactMessages({ status, skip, take });

  return (
    <SettingsCard title={t("title")} description={t("intro")}>
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
                <ActionButton action={setContactMessageRead.bind(null, m.id, !m.isRead)} variant="ghost">
                  {m.isRead ? <Mail className="size-4" /> : <MailOpen className="size-4" />} {m.isRead ? t("markUnread") : t("markRead")}
                </ActionButton>
                <ConfirmButton action={deleteContactMessage.bind(null, m.id)} size="icon-sm" description={t("deleteConfirm")} ariaLabel={tc("actions.delete")}>
                  <Trash2 className="size-4 text-red-600" />
                </ConfirmButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/dashboard/settings/contact" searchParams={sp} />
    </SettingsCard>
  );
}

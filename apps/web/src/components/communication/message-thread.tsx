import { useLocale, useTranslations } from "use-intl";
import { useState } from "react";
import { Link } from "@/lib/router";
import { CheckCheck, ChevronLeft, Users } from "lucide-react";
import { formatDate, formatTime, startOfDay, addDays } from "@onet/shared";
import { ROLE_KEYS } from "@onet/shared";
import { cn } from "@/lib/utils";
import type { messagesPage } from "@api/modules/communication/routes";
import type { Loaded } from "@/lib/types";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { ContactOption } from "./compose-form";
import { GroupIcon } from "./conversation-list";
import { GroupMembersModal } from "./group-members";
import { MessageComposer, ScrollToBottom } from "./message-composer";

type Thread = NonNullable<Loaded<typeof messagesPage>["thread"]>;

/** "Amel Kefi" → AvatarStack person. */
const asPerson = (name: string, photoUrl: string | null) => {
  const [first = "", ...rest] = name.split(" ");
  return { firstName: first, lastName: rest.join(" "), photoUrl };
};

export function MessageThread({ thread, meId, canReply, contacts }: { thread: Thread; meId: string; canReply: boolean; contacts: ContactOption[] }) {
  const t = useTranslations("communication.messages");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [membersOpen, setMembersOpen] = useState(false);
  const group = thread.kind === "GROUP";
  const other = thread.others[0];
  const today = startOfDay();
  const yesterday = addDays(today, -1);
  const dayLabel = (d: Date) => (d >= today ? t("today") : d >= yesterday ? t("yesterday") : formatDate(d, locale, "long"));
  const lastMine = [...thread.messages].reverse().find((m) => m.senderId === meId);
  const lastIsMine = !!lastMine && thread.messages[thread.messages.length - 1]?.id === lastMine.id;
  const readers = lastIsMine ? thread.others.filter((o) => o.lastReadAt && o.lastReadAt >= lastMine.createdAt).length : 0;
  const seen = lastIsMine && thread.others.length > 0 && readers === thread.others.length;
  const roles = (other?.roles ?? []).filter((r) => (ROLE_KEYS as readonly string[]).includes(r));

  let lastDay = "";
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-line px-3 py-3 sm:px-5">
        <Link href="/dashboard/messages" className="-ms-1 rounded-xl p-2 text-ink-2 hover:bg-surface-2 lg:hidden" aria-label={t("back")}>
          <ChevronLeft className="rtl-flip size-5" />
        </Link>
        {group ? (
          <>
            <GroupIcon team={!!thread.team} />
            <button type="button" onClick={() => setMembersOpen(true)} className="min-w-0 flex-1 rounded-xl text-start focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:outline-none" aria-label={t("groups.showMembers")}>
              <h2 className="flex items-center gap-2 text-base font-extrabold text-ink">
                <span className="truncate">{thread.title}</span>
                {thread.team && <Badge tone="info">{t("groups.team")}</Badge>}
              </h2>
              <p className="truncate text-xs text-muted">{thread.team ? `${thread.team.editionTitle} · ${t("groups.members", { count: thread.participantsCount })}` : t("groups.members", { count: thread.participantsCount })}</p>
            </button>
            <button type="button" onClick={() => setMembersOpen(true)} className="hidden shrink-0 items-center gap-2 rounded-full p-1 hover:bg-surface-2 sm:flex" aria-label={t("groups.showMembers")}>
              <AvatarStack people={thread.participants.map((p) => asPerson(p.name, p.avatarUrl))} max={4} />
            </button>
            <button type="button" onClick={() => setMembersOpen(true)} className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-2 hover:bg-surface-2 sm:hidden" aria-label={t("groups.showMembers")}>
              <Users className="size-5" />
            </button>
          </>
        ) : (
          <>
            <Avatar name={other?.name ?? "?"} src={other?.avatarUrl} />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-extrabold text-ink">{thread.title}</h2>
              <p className="truncate text-xs text-muted">{[thread.subject, roles.map((r) => tc(`roles.${r}`)).join(" · ")].filter(Boolean).join(" — ")}</p>
            </div>
          </>
        )}
        <span className="hidden items-center gap-1.5 rounded-full bg-leaf-soft px-2.5 py-1 text-[11px] font-bold text-emerald-700 xl:flex">
          <span className="size-1.5 animate-pulse rounded-full bg-leaf" /> {t("liveHint")}
        </span>
      </header>
      {group && !thread.isParticipant && <p className="border-b border-line bg-sun-soft px-4 py-2 text-xs font-semibold text-amber-800">{t("groups.readOnly")}</p>}
      <div data-scroll className="bg-confetti min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6">
        {thread.messages.length === 0 && <p className="py-10 text-center text-sm text-muted">{t("noMessagesYet")}</p>}
        <ol className="space-y-1.5">
          {thread.messages.map((m, i) => {
            const mine = m.senderId === meId;
            const day = startOfDay(m.createdAt).toISOString();
            const showDay = day !== lastDay;
            lastDay = day;
            const prev = thread.messages[i - 1];
            const grouped = !showDay && prev?.senderId === m.senderId && +m.createdAt - +prev.createdAt < 5 * 60_000;
            return (
              <li key={m.id}>
                {showDay && (
                  <div className="my-4 flex justify-center">
                    <span className="rounded-full bg-surface px-3 py-1 text-[11px] font-bold text-muted shadow-[var(--shadow-soft)]">{dayLabel(m.createdAt)}</span>
                  </div>
                )}
                <div className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start", !grouped && "mt-3")}>
                  {!mine && <span className="w-8 shrink-0">{!grouped && <Avatar name={m.sender.name} src={m.sender.avatarUrl} size="sm" />}</span>}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-3xl px-4 py-2.5 text-sm leading-relaxed shadow-[var(--shadow-soft)] sm:max-w-[70%]",
                      mine ? "rounded-ee-lg bg-gradient-to-br from-brand-600 to-brand-500 text-white" : "rounded-es-lg border border-line bg-surface text-ink",
                    )}
                  >
                    {group && !mine && !grouped && <p className="mb-0.5 truncate text-xs font-extrabold text-brand-700">{m.sender.name}</p>}
                    <p dir="auto" className="break-words whitespace-pre-line">{m.body}</p>
                    <p className={cn("mt-1 text-end text-[10px] font-semibold tabular-nums", mine ? "text-white/75" : "text-muted")}>{formatTime(m.createdAt, locale)}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        {(seen || (group && readers > 0)) && (
          <p className="mt-1 flex items-center justify-end gap-1 text-[11px] font-bold text-muted">
            <CheckCheck className="size-3.5 text-sky" /> {group ? t("seenBy", { count: readers }) : t("seen")}
          </p>
        )}
        <ScrollToBottom dep={`${thread.id}:${thread.messages.length}`} />
      </div>
      {canReply && <MessageComposer conversationId={thread.id} />}
      {group && <GroupMembersModal open={membersOpen} onClose={() => setMembersOpen(false)} thread={thread} meId={meId} contacts={contacts} />}
    </div>
  );
}

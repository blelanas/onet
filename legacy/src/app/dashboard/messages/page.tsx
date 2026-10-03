import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChevronLeft, MessageCircle, PenSquare } from "lucide-react";
import { pageQuery, requirePagePermission } from "@/lib/auth/guards";
import { cn } from "@/lib/utils";
import { allowedContacts } from "@/server/communication/contacts";
import { findDirectConversation, listConversations, openConversation } from "@/server/communication/messages";
import { ComposeForm } from "@/components/communication/compose-form";
import { ConversationList } from "@/components/communication/conversation-list";
import { MessageThread } from "@/components/communication/message-thread";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBox } from "@/components/ui/toolbar";

export async function generateMetadata() {
  const t = await getTranslations("communication.messages");
  return { title: t("title") };
}

type SP = Record<string, string | string[] | undefined>;

export default async function MessagesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePagePermission("messages.use");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const t = await getTranslations("communication.messages");
  const c = str("c");
  const to = str("to");
  const compose = !c && (str("new") === "1" || !!to);

  const contacts = await allowedContacts(user);
  // ?to=<userId> continues an existing one-to-one thread when there is one.
  if (to && contacts.some((x) => x.id === to)) {
    const existing = await findDirectConversation(user.id, to);
    if (existing) redirect(`/dashboard/messages?c=${existing}`);
  }

  const [conversations, thread] = await Promise.all([listConversations(user, str("q")), c ? pageQuery(openConversation(user, c)) : Promise.resolve(null)]);
  const contactIds = new Set(contacts.map((x) => x.id));
  const canReply = !!thread && thread.others.every((o) => contactIds.has(o.id));
  const detailOpen = !!thread || compose;
  const totalUnread = conversations.reduce((s, x) => s + x.unread, 0);

  return (
    <div className="card flex h-[calc(100dvh-10.5rem)] min-h-[480px] overflow-hidden lg:h-[calc(100dvh-8rem)]">
      {/* Conversations */}
      <aside className={cn("flex w-full min-w-0 flex-col border-line lg:w-[340px] lg:shrink-0 lg:border-e", detailOpen && "hidden lg:flex")}>
        <div className="space-y-3 border-b border-line p-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink">
              {t("title")}
              {totalUnread > 0 && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-extrabold text-white">{totalUnread}</span>}
            </h1>
            <LinkButton href="/dashboard/messages?new=1" size="sm" scroll={false}>
              <PenSquare className="size-4" /> {t("new")}
            </LinkButton>
          </div>
          <SearchBox placeholder={t("search")} className="sm:max-w-none" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <EmptyState compact title={t("empty.title")} description={t("empty.description")} icon={<MessageCircle className="size-4" />} />
          ) : (
            <ConversationList items={conversations} activeId={c} meId={user.id} />
          )}
        </div>
      </aside>

      {/* Thread / compose */}
      <section className={cn("min-w-0 flex-1 flex-col bg-surface", detailOpen ? "flex" : "hidden lg:flex")}>
        {thread ? (
          <MessageThread thread={thread} meId={user.id} canReply={canReply} />
        ) : compose ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-line px-3 py-2 lg:hidden">
              <LinkButton href="/dashboard/messages" variant="ghost" size="sm">
                <ChevronLeft className="rtl-flip size-4" /> {t("back")}
              </LinkButton>
            </div>
            {to && !contactIds.has(to) && <p className="m-4 mb-0 rounded-2xl bg-sun-soft p-3 text-sm font-semibold text-amber-800">{t("compose.notAllowed")}</p>}
            <div className="min-h-0 flex-1">
              <ComposeForm contacts={contacts} initialTo={to} />
            </div>
          </div>
        ) : (
          <div className="bg-confetti grid h-full place-items-center">
            <EmptyState
              title={t("pick.title")}
              description={t("pick.description")}
              icon={<MessageCircle className="size-4" />}
              action={
                <LinkButton href="/dashboard/messages?new=1" scroll={false}>
                  <PenSquare className="size-4" /> {t("new")}
                </LinkButton>
              }
            />
          </div>
        )}
      </section>
    </div>
  );
}

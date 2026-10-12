import { useEffect } from "react";
import { useTranslations } from "use-intl";
import { ChevronLeft, MessageCircle, PenSquare, Users } from "lucide-react";
import type { allGroupsPage, messagesPage } from "@api/modules/communication/routes";
import { cn } from "@/lib/utils";
import { queryClient, useApi } from "@/lib/query";
import { Link, Navigate, useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { QueryView } from "@/components/states/page-state";
import { RequirePerm } from "@/components/states/guards";
import { ComposeForm } from "@/components/communication/compose-form";
import { AllGroupsList, ConversationList } from "@/components/communication/conversation-list";
import { MessageThread } from "@/components/communication/message-thread";
import { NewGroupButton } from "@/components/communication/new-group";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchBox } from "@/components/ui/toolbar";

type Data = Loaded<typeof messagesPage>;

/** Threads poll every 8 s while a conversation is open (TanStack pauses intervals when the tab is hidden). */
const THREAD_REFRESH_MS = 8000;

/** /dashboard/messages (?c=<conversation>, ?new=1, ?to=<userId>, ?q=, ?view=groups for platform admins) */
export function Component() {
  const t = useTranslations("communication.messages");
  usePageTitle(t("title"));
  return (
    <RequirePerm perm="messages.use">
      <Messages />
    </RequirePerm>
  );
}

function Messages() {
  const sp = useSearchParamsObject();
  const query = useApi<Data>("/messages", { q: sp.q, c: sp.c, to: sp.c ? undefined : sp.to }, { refetchInterval: sp.c ? THREAD_REFRESH_MS : undefined });

  // Opening a thread marks its MESSAGE notifications read → refresh the shell's unread badge.
  const threadId = query.data?.thread?.id;
  useEffect(() => {
    if (threadId) void queryClient.invalidateQueries({ queryKey: ["/auth/me"] });
  }, [threadId]);

  // Refresh as soon as the tab becomes visible again.
  const { refetch } = query;
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refetch]);

  return (
    <QueryView query={query}>
      {(data) => (data.redirectTo && !sp.c ? <Navigate to={`/dashboard/messages?c=${data.redirectTo}`} replace /> : <MessagesView data={data} sp={sp} />)}
    </QueryView>
  );
}

function MessagesView({ data, sp }: { data: Data; sp: Record<string, string | undefined> }) {
  const t = useTranslations("communication.messages");
  const { c, to } = sp;
  const compose = !c && (sp.new === "1" || !!to);
  const { contacts, conversations, thread, canReply, totalUnread, meId, toAllowed, platformAdmin } = data;
  const detailOpen = !!thread || compose;
  // Platform admins can switch the list to every group (?view=groups).
  const allGroups = platformAdmin && sp.view === "groups";
  const viewHref = (v?: string) => {
    const p = new URLSearchParams();
    if (v) p.set("view", v);
    if (sp.q) p.set("q", sp.q);
    const qs = p.toString();
    return `/dashboard/messages${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="card flex h-[calc(100dvh-10.5rem)] min-h-[480px] overflow-hidden lg:h-[calc(100dvh-8rem)]">
      {/* Conversations */}
      <aside className={cn("flex w-full min-w-0 flex-col border-line lg:w-[340px] lg:shrink-0 lg:border-e", detailOpen && "hidden lg:flex")}>
        <div className="space-y-3 border-b border-line p-4">
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink">
            {t("title")}
            {totalUnread > 0 && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-extrabold text-white">{totalUnread}</span>}
          </h1>
          <div className="flex gap-2">
            <LinkButton href="/dashboard/messages?new=1" size="sm" scroll={false} className="min-w-0 flex-1">
              <PenSquare className="size-4" /> <span className="truncate">{t("new")}</span>
            </LinkButton>
            <NewGroupButton contacts={contacts} className="min-w-0 flex-1" />
          </div>
          {platformAdmin && (
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 text-xs font-bold" role="tablist">
              {[
                { key: "mine", label: t("groups.mine"), href: viewHref(), on: !allGroups },
                { key: "groups", label: t("groups.all"), href: viewHref("groups"), on: allGroups },
              ].map((x) => (
                <Link key={x.key} href={x.href} scroll={false} role="tab" aria-selected={x.on} className={cn("truncate rounded-lg px-2 py-1.5 text-center transition", x.on ? "bg-surface text-brand-700 shadow-[var(--shadow-soft)]" : "text-muted hover:text-ink")}>
                  {x.label}
                </Link>
              ))}
            </div>
          )}
          <SearchBox placeholder={t("search")} className="sm:max-w-none" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {allGroups ? (
            <AllGroups q={sp.q} activeId={c} />
          ) : conversations.length === 0 ? (
            <EmptyState compact title={t("empty.title")} description={t("empty.description")} icon={<MessageCircle className="size-4" />} />
          ) : (
            <ConversationList items={conversations} activeId={c} meId={meId} />
          )}
        </div>
      </aside>

      {/* Thread / compose */}
      <section className={cn("min-w-0 flex-1 flex-col bg-surface", detailOpen ? "flex" : "hidden lg:flex")}>
        {thread ? (
          <MessageThread key={thread.id} thread={thread} meId={meId} canReply={canReply} contacts={contacts} />
        ) : compose ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-line px-3 py-2 lg:hidden">
              <LinkButton href="/dashboard/messages" variant="ghost" size="sm">
                <ChevronLeft className="rtl-flip size-4" /> {t("back")}
              </LinkButton>
            </div>
            {to && !toAllowed && <p className="m-4 mb-0 rounded-2xl bg-sun-soft p-3 text-sm font-semibold text-amber-800">{t("compose.notAllowed")}</p>}
            <div className="min-h-0 flex-1">
              <ComposeForm key={to ?? "new"} contacts={contacts} initialTo={to} />
            </div>
          </div>
        ) : (
          <div className="bg-confetti grid h-full place-items-center">
            <EmptyState
              title={t("pick.title")}
              description={t("pick.description")}
              icon={<MessageCircle className="size-4" />}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <LinkButton href="/dashboard/messages?new=1" scroll={false}>
                    <PenSquare className="size-4" /> {t("new")}
                  </LinkButton>
                  <NewGroupButton contacts={contacts} size="md" />
                </div>
              }
            />
          </div>
        )}
      </section>
    </div>
  );
}

/** Platform admins: every chat group (GET /messages/groups/all). */
function AllGroups({ q, activeId }: { q?: string; activeId?: string }) {
  const t = useTranslations("communication.messages");
  const query = useApi<Loaded<typeof allGroupsPage>>("/messages/groups/all", { q });
  return (
    <QueryView query={query} skeleton={<div className="space-y-2 p-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>}>
      {({ rows }) => (rows.length ? <AllGroupsList items={rows} activeId={activeId} /> : <EmptyState compact title={t("groups.allEmpty")} icon={<Users className="size-4" />} />)}
    </QueryView>
  );
}

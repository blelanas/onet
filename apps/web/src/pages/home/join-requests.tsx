import { useLocale, useTranslations } from "use-intl";
import { Baby, Cake, Info, Mail, MessageSquareQuote, Phone, UserPlus, X } from "lucide-react";
import type { joinRequestsPage } from "@api/modules/joinRequests/routes";
import { formatDate, relativeTime } from "@onet/shared";
import { rejectJoinRequest } from "@/api/join-requests";
import { useApi } from "@/lib/query";
import { Link, useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { QueryView } from "@/components/states/page-state";
import { RequirePerm } from "@/components/states/guards";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { LinkTabs } from "@/components/ui/tabs";
import { ApproveForm } from "@/components/dashboard/join-request-actions";

type Data = Loaded<typeof joinRequestsPage>;

export function Component() {
  const t = useTranslations("dashboard.joinRequests");
  usePageTitle(t("title"));
  return (
    <RequirePerm perm="members.manage">
      <JoinRequestsPage />
    </RequirePerm>
  );
}

function JoinRequestsPage() {
  const sp = useSearchParamsObject();
  const query = useApi<Data>("/join-requests", { tab: sp.tab, page: sp.page });
  return <QueryView query={query}>{(data) => <JoinRequests data={data} sp={sp} />}</QueryView>;
}

function JoinRequests({ data, sp }: { data: Data; sp: Record<string, string | undefined> }) {
  const t = useTranslations("dashboard.joinRequests");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const { tab, page, pageSize } = data;

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} icon={<UserPlus className="size-6" />} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title") }]} />
      <LinkTabs
        active={tab}
        tabs={[
          { key: "pending", label: t("tabs.pending"), href: "/dashboard/join-requests", count: data.pending },
          { key: "processed", label: t("tabs.processed"), href: "/dashboard/join-requests?tab=processed", count: data.processed },
        ]}
      />

      {!data.rows.length ? (
        <div className="card">
          {tab === "pending" ? <EmptyState title={t("emptyPending")} description={t("emptyPendingHint")} icon={<UserPlus className="size-4" />} /> : <EmptyState title={t("emptyProcessed")} />}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {data.rows.map((r) => (
            <li key={r.id} className="card flex flex-col overflow-hidden">
              <div className="flex items-start gap-3 p-4 sm:p-5">
                <Avatar name={r.parentName} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="truncate text-lg font-extrabold text-ink">{r.parentName}</p>
                    {tab === "processed" ? <StatusBadge status={r.status} /> : <span className="text-xs font-semibold text-muted">{t("receivedAgo", { when: relativeTime(r.createdAt, locale) })}</span>}
                  </div>
                  <div className="mt-1 flex flex-col gap-0.5 text-sm text-ink-2 sm:flex-row sm:flex-wrap sm:gap-x-4">
                    <a href={`mailto:${r.email}`} className="inline-flex min-w-0 items-center gap-1.5 hover:text-brand-700">
                      <Mail className="size-3.5 shrink-0 text-muted" /> <span className="truncate">{r.email}</span>
                    </a>
                    <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-brand-700" dir="ltr">
                      <Phone className="size-3.5 text-muted" /> {r.phone}
                    </a>
                  </div>
                </div>
              </div>

              <div className="mx-4 rounded-2xl bg-surface-2/70 p-3 sm:mx-5">
                {r.childName ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-sun-soft text-amber-700">
                      <Baby className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-muted">{t("child")}</p>
                      <p className="font-bold text-ink">{r.childName}</p>
                    </div>
                    {r.childDob && (
                      <span className="inline-flex items-center gap-1 text-sm text-ink-2">
                        <Cake className="size-4 text-muted" /> {formatDate(r.childDob, locale)} {r.age != null && <Badge tone="neutral">{t("age", { count: r.age })}</Badge>}
                      </span>
                    )}
                    {r.suggested && tab === "pending" && <Badge color={r.suggested.color}>{r.suggested.name}</Badge>}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-muted">{t("noChild")}</p>
                )}
                {r.message && (
                  <p className="mt-3 flex gap-2 border-t border-line pt-3 text-sm text-ink-2">
                    <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-muted" /> <span className="italic">{r.message}</span>
                  </p>
                )}
              </div>

              <div className="mt-auto p-4 sm:p-5">
                {tab === "pending" ? (
                  <>
                    {r.existingParentId && (
                      <p className="mb-3 flex items-start gap-2 rounded-xl bg-sky-soft p-2.5 text-xs font-semibold text-sky-800">
                        <Info className="mt-0.5 size-3.5 shrink-0" /> {t("existingParent")}
                      </p>
                    )}
                    <ApproveForm id={r.id} hasChild={!!r.childName} groups={data.groups} suggestedId={r.suggested?.id}>
                      <ConfirmButton action={() => rejectJoinRequest(r.id)} variant="outline" size="md" title={t("rejectTitle")} description={t("rejectText")} confirmLabel={t("reject")} successMessage={t("rejected")}>
                        <X className="size-4 text-red-600" /> {t("reject")}
                      </ConfirmButton>
                    </ApproveForm>
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-2 text-xs text-muted">
                    <span>{r.processedAt && t("processedOn", { date: formatDate(r.processedAt, locale) })}</span>
                    {r.status === "APPROVED" && (
                      <Link href={`/dashboard/members?q=${encodeURIComponent(r.email)}`} className="font-bold text-brand-600 hover:text-brand-700">
                        {t("viewMembers")}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageSize={pageSize} total={data.total} basePath="/dashboard/join-requests" searchParams={sp} />
    </>
  );
}

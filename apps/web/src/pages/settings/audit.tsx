import { useLocale, useTranslations } from "use-intl";
import { ChevronDown, ScrollText } from "lucide-react";
import type { auditLogPage } from "@api/modules/settings/routes";
import { useApi } from "@/lib/query";
import { useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { QueryView } from "@/components/states/page-state";
import { RequirePerm } from "@/components/states/guards";
import { formatDateTime } from "@onet/shared";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type Tone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { FilterSelect, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { SettingsCard } from "@/components/settings/settings-card";

const ACTION_TONES: Record<string, Tone> = {
  create: "success",
  update: "info",
  delete: "danger",
  payment: "teal",
  permission_change: "violet",
  export: "warning",
  login: "neutral",
  deactivate: "danger",
  activate: "success",
  reset_password: "warning",
};

function pretty(details: string | null) {
  if (!details) return null;
  try {
    return JSON.stringify(JSON.parse(details), null, 2);
  } catch {
    return details;
  }
}

type Data = Loaded<typeof auditLogPage>;

/** /dashboard/settings/audit — audit log viewer (?q, ?user, ?action, ?entity, ?page). */
export function Component() {
  const tn = useTranslations("settings.nav");
  usePageTitle(tn("audit"));
  return (
    <RequirePerm perm="audit.read">
      <Page />
    </RequirePerm>
  );
}

function Page() {
  const t = useTranslations("settings.audit");
  const sp = useSearchParamsObject();
  const query = useApi<Data>("/settings/audit", sp);
  return (
    <SettingsCard title={t("title")} description={t("intro")}>
      <QueryView query={query}>{(data) => <AuditLog data={data} sp={sp} />}</QueryView>
    </SettingsCard>
  );
}

function AuditLog({ data, sp }: { data: Data; sp: Record<string, string | undefined> }) {
  const t = useTranslations("settings.audit");
  const locale = useLocale();
  const { rows, total, actions, entities, users, page, pageSize } = data;

  return (
    <>
      <Toolbar>
        <SearchBox placeholder={t("search")} />
        <FilterSelect param="user" allLabel={t("allUsers")} options={users.map((u) => ({ value: u.id, label: u.name }))} />
        <FilterSelect param="action" allLabel={t("allActions")} options={actions.map((a) => ({ value: a, label: a }))} />
        <FilterSelect param="entity" allLabel={t("allEntities")} options={entities.map((e) => ({ value: e, label: e }))} />
      </Toolbar>
      {rows.length === 0 ? (
        <EmptyState compact title={t("empty")} icon={<ScrollText className="size-4" />} />
      ) : (
        <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {rows.map((r) => {
            const json = pretty(r.details);
            return (
              <li key={r.id}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-3 transition hover:bg-surface-2/60 sm:px-4 [&::-webkit-details-marker]:hidden">
                    <Avatar name={r.user?.name ?? t("system")} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-bold text-ink">{r.user?.name ?? t("system")}</span>
                        <Badge tone={ACTION_TONES[r.action] ?? "neutral"}>{r.action}</Badge>
                        <span className="text-sm font-semibold text-ink-2">{r.entity}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {formatDateTime(r.createdAt, locale)}
                        {r.entityId && (
                          <>
                            {" · "}
                            <span dir="ltr" className="font-mono">
                              {r.entityId}
                            </span>
                          </>
                        )}
                        {r.ip && (
                          <>
                            {" · "}
                            <span dir="ltr">{r.ip}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <ChevronDown className="size-4 shrink-0 text-muted transition group-open:rotate-180" aria-label={t("details")} />
                  </summary>
                  <div className="bg-surface-2/50 px-3 pb-3 sm:px-4">
                    {json ? (
                      <pre className="overflow-x-auto rounded-xl bg-ink p-3 font-mono text-xs leading-relaxed text-emerald-200" dir="ltr">
                        {json}
                      </pre>
                    ) : (
                      <p className="pt-1 text-xs text-muted">{t("noDetails")}</p>
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      )}
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/dashboard/settings/audit" searchParams={sp} />
    </>
  );
}

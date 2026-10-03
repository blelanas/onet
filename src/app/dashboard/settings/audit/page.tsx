import { getLocale, getTranslations } from "next-intl/server";
import { ChevronDown, ScrollText } from "lucide-react";
import { requirePagePermission } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/dates";
import { listAuditLogs } from "@/server/settings/queries";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type Tone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, paging } from "@/components/ui/pagination";
import { FilterSelect, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { SettingsCard } from "@/components/settings/settings-card";

export async function generateMetadata() {
  const t = await getTranslations("settings.nav");
  return { title: t("audit") };
}

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

type SP = Record<string, string | string[] | undefined>;

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePagePermission("audit.read");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const t = await getTranslations("settings.audit");
  const locale = await getLocale();
  const { page, pageSize, skip, take } = paging(sp, 25);
  const { rows, total, actions, entities, users } = await listAuditLogs({ userId: str("user"), action: str("action"), entity: str("entity"), q: str("q"), skip, take });

  return (
    <SettingsCard title={t("title")} description={t("intro")}>
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
    </SettingsCard>
  );
}

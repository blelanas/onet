import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import { Check, Info, Link2, Mail, Phone, UserCheck, X } from "lucide-react";
import type { approvalsPendingPage } from "@api/modules/signup/routes";
import { relativeTime } from "@onet/shared";
import { approveUsers, rejectUsers } from "@/api/approvals";
import { useApi } from "@/lib/query";
import type { Loaded } from "@/lib/types";
import { QueryView } from "@/components/states/page-state";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ApprovalTabs, Intro, RoleBadge, useFirstPageWhenPastEnd } from "./shared";

type Data = Loaded<typeof approvalsPendingPage>;
type Row = Data["rows"][number];

export function PendingTab({ sp }: { sp: Record<string, string | undefined> }) {
  const query = useApi<Data>("/approvals/pending", { page: sp.page });
  return <QueryView query={query}>{(data) => <Pending data={data} sp={sp} />}</QueryView>;
}

const checkbox = "size-5 shrink-0 cursor-pointer rounded-md border-line accent-brand-600";

function Pending({ data, sp }: { data: Data; sp: Record<string, string | undefined> }) {
  const t = useTranslations("approvals.pending");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Drop ids that left the list (approved/rejected elsewhere, other page).
  const ids = useMemo(() => data.rows.map((r) => r.id), [data.rows]);
  useEffect(() => setSelected((s) => new Set([...s].filter((id) => ids.includes(id)))), [ids]);
  const allChecked = ids.length > 0 && ids.every((id) => selected.has(id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const count = selected.size;
  const pastEnd = useFirstPageWhenPastEnd(data);
  const run = (fn: (ids: string[]) => ReturnType<typeof approveUsers>) => async () => {
    const res = await fn([...selected]);
    if (res.ok) setSelected(new Set());
    return res;
  };

  const select = (r: Row) => <input type="checkbox" className={checkbox} checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={t("selectRow", { name: r.name })} />;
  const person = (r: Row) => (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar name={r.name} />
      <span className="min-w-0">
        <span className="block truncate font-bold text-ink">{r.name}</span>
        <span className="flex min-w-0 items-center gap-1 text-xs text-muted">
          <Mail className="size-3 shrink-0" />
          <span className="truncate" dir="ltr">
            {r.email}
          </span>
        </span>
        {r.phone && (
          <span className="flex items-center gap-1 text-xs text-muted">
            <Phone className="size-3 shrink-0" />
            <span dir="ltr">{r.phone}</span>
          </span>
        )}
      </span>
    </span>
  );
  const invitation = (r: Row) =>
    r.invitationId ? (
      <span className="inline-flex items-center gap-1 text-sm text-ink-2">
        <Link2 className="size-3.5 shrink-0 text-muted" /> {r.invitationLabel ?? t("noLabel")}
      </span>
    ) : (
      <span className="text-muted">{t("noInvitation")}</span>
    );
  const known = (r: Row) =>
    r.known.length ? (
      <span className="flex flex-col gap-1">
        {r.known.map((k) => (
          <span key={k.id} className="inline-flex items-start gap-1.5 rounded-lg bg-sky-soft px-2 py-1 text-xs font-semibold text-sky-800">
            <Info className="mt-px size-3.5 shrink-0" />
            <span>
              {t("known", { name: k.name })} · {tc(`enums.memberType.${k.type}`)} · <span dir="ltr">{k.membershipNumber}</span>
              {k.hasAccount && <> · {t("hasAccount")}</>}
            </span>
          </span>
        ))}
      </span>
    ) : (
      <span className="text-xs text-muted">{t("unknown")}</span>
    );

  const columns: Column<Row>[] = [
    { key: "select", header: <input type="checkbox" className={checkbox} checked={allChecked} onChange={() => setSelected(allChecked ? new Set() : new Set(ids))} aria-label={t("selectAll")} />, cell: select, className: "w-10" },
    { key: "person", header: t("columns.person"), cell: person },
    { key: "role", header: t("columns.role"), cell: (r) => (r.requestedRole ? <RoleBadge role={r.requestedRole} /> : null) },
    { key: "invitation", header: t("columns.invitation"), cell: invitation, hideBelow: "lg" },
    { key: "signedUp", header: t("columns.signedUp"), cell: (r) => <span className="text-sm whitespace-nowrap text-muted">{relativeTime(r.createdAt, locale)}</span>, hideBelow: "xl" },
    { key: "known", header: t("columns.known"), cell: known, hideBelow: "lg" },
  ];

  return (
    <div data-testid="approvals-pending">
      <ApprovalTabs active="pending" counts={data.counts} />
      <Intro>{t("intro")}</Intro>
      {pastEnd ? null : !data.rows.length ? (
        <div className="card">
          <EmptyState title={t("empty")} description={t("emptyHint")} icon={<UserCheck className="size-4" />} />
        </div>
      ) : (
        <>
          <div className="sticky top-16 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface/95 p-2.5 shadow-[var(--shadow-soft)] backdrop-blur">
            <label className="flex cursor-pointer items-center gap-2 px-1.5 text-sm font-bold text-ink-2">
              <input type="checkbox" className={checkbox} checked={allChecked} onChange={() => setSelected(allChecked ? new Set() : new Set(ids))} />
              {t("selectAll")}
            </label>
            <span className="text-sm text-muted" aria-live="polite">
              {t("selected", { count })}
            </span>
            <span className="ms-auto flex gap-2">
              <ConfirmButton
                action={run(rejectUsers)}
                disabled={!count}
                variant="outline"
                size="md"
                title={t("rejectTitle", { count })}
                description={t("rejectText")}
                confirmLabel={t("reject")}
                successMessage={t("rejected", { count })}
              >
                <X className="size-4 text-red-600" /> {t("reject")}
              </ConfirmButton>
              <ConfirmButton
                action={run(approveUsers)}
                disabled={!count}
                variant="success"
                size="md"
                tone="primary"
                title={t("approveTitle", { count })}
                description={t("approveText")}
                confirmLabel={t("approve")}
                successMessage={t("approved", { count })}
              >
                <Check className="size-4" /> {t("approve")}
              </ConfirmButton>
            </span>
          </div>
          <DataTable
            rows={data.rows}
            columns={columns}
            rowKey={(r) => r.id}
            mobileCard={(r) => (
              <div className="flex gap-3">
                <div className="pt-2.5">{select(r)}</div>
                <div className="min-w-0 flex-1 space-y-2">
                  {person(r)}
                  <div className="flex flex-wrap items-center gap-2">
                    {r.requestedRole && <RoleBadge role={r.requestedRole} />}
                    {invitation(r)}
                    <span className="text-xs text-muted">· {relativeTime(r.createdAt, locale)}</span>
                  </div>
                  {known(r)}
                </div>
              </div>
            )}
          />
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} basePath="/dashboard/approvals" searchParams={sp} />
        </>
      )}
    </div>
  );
}

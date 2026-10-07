import { useRef, useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import { Ban, Copy, Link2, Plus, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import type { approvalsInvitationsPage } from "@api/modules/signup/routes";
import { formatDate, relativeTime, toDateTimeInput } from "@onet/shared";
import { createInvitation, revokeInvitation, type CreatedInvitation } from "@/api/approvals";
import { useApi } from "@/lib/query";
import type { Loaded } from "@/lib/types";
import { cn } from "@/lib/utils";
import { QueryView } from "@/components/states/page-state";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select, inputClasses } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { ApprovalTabs, Intro, RoleBadge } from "./shared";

type Data = Loaded<typeof approvalsInvitationsPage>;
type Row = Data["rows"][number];

const STATE_TONE: Record<Row["state"], Tone> = { valid: "success", expired: "neutral", full: "violet", revoked: "danger" };

export function InvitationsTab({ sp }: { sp: Record<string, string | undefined> }) {
  const query = useApi<Data>("/approvals/invitations", { page: sp.page });
  return <QueryView query={query}>{(data) => <Invitations data={data} sp={sp} />}</QueryView>;
}

/** The public sign-up link of an invitation token (the web app's own origin). */
const inviteLink = (token: string) => `${window.location.origin}/signup?invite=${encodeURIComponent(token)}`;

function Invitations({ data, sp }: { data: Data; sp: Record<string, string | undefined> }) {
  const t = useTranslations("approvals.invitations");
  const ta = useTranslations("approvals");
  const tr = useTranslations("common.roles");
  const locale = useLocale();
  const [created, setCreated] = useState<CreatedInvitation | null>(null);
  const defaultExpiry = useState(() => toDateTimeInput(new Date(Date.now() + 7 * 86400_000)).slice(0, 16))[0];

  const columns: Column<Row>[] = [
    {
      key: "label",
      header: t("columns.label"),
      cell: (r) => (
        <span className="flex min-w-0 items-center gap-3">
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", r.state === "valid" ? "bg-brand-50 text-brand-600" : "bg-surface-2 text-muted")}>
            <Link2 className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-bold text-ink">{r.label ?? ta("pending.noLabel")}</span>
            <span className="block truncate text-xs text-muted">{t("createdBy", { name: r.createdByName ?? "—", when: relativeTime(r.createdAt, locale) })}</span>
          </span>
        </span>
      ),
    },
    { key: "role", header: t("columns.role"), cell: (r) => <RoleBadge role={r.role} /> },
    {
      key: "uses",
      header: t("columns.uses"),
      cell: (r) => (
        <span className="inline-flex min-w-24 flex-col gap-1">
          <span className="text-sm font-bold text-ink tabular-nums" dir="ltr">
            {t("usesValue", { uses: r.uses, max: r.maxUses })}
          </span>
          <span className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden>
            <span className="block h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, (r.uses / r.maxUses) * 100)}%` }} />
          </span>
        </span>
      ),
    },
    { key: "expires", header: t("columns.expires"), cell: (r) => <span className="text-sm whitespace-nowrap text-ink-2">{formatDate(r.expiresAt, locale)}</span>, hideBelow: "lg" },
    { key: "status", header: t("columns.status"), cell: (r) => <Badge tone={STATE_TONE[r.state]} dot>{t(`state.${r.state}`)}</Badge> },
    {
      key: "actions",
      header: t("columns.actions"),
      align: "end",
      cell: (r) =>
        r.state === "valid" || r.state === "full" ? (
          <ConfirmButton action={() => revokeInvitation(r.id)} size="sm" variant="ghost" title={t("revokeTitle")} description={t("revokeText")} confirmLabel={t("revoke")} successMessage={t("revoked")}>
            <Ban className="size-4 text-red-600" /> {t("revoke")}
          </ConfirmButton>
        ) : null,
    },
  ];

  return (
    <>
      <ApprovalTabs active="invitations" counts={data.counts} />
      <Intro>{t("intro")}</Intro>
      <Card className="mb-5">
        <CardHeader title={t("newTitle")} icon={<Plus className="size-5" />} />
        <CardBody>
          <ActionForm action={createInvitation} successMessage="toast.created" resetOnSuccess onSuccess={(d) => d && setCreated(d)} className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
            {(pending) => (
              <>
                <Select name="role" label={t("role")} options={[{ value: "monitor", label: tr("monitor") }, { value: "member", label: tr("member") }]} defaultValue="monitor" required />
                <Input name="label" label={t("label")} placeholder={t("labelPlaceholder")} maxLength={80} />
                <Input name="expiresAt" type="datetime-local" label={t("expiresAt")} defaultValue={defaultExpiry} required />
                <Input name="maxUses" type="number" inputMode="numeric" min={1} max={500} label={t("maxUses")} hint={t("maxUsesHint")} defaultValue={50} required />
                <Button type="submit" loading={pending} className="sm:col-span-2 xl:col-span-1 xl:mt-[26px]">
                  <Link2 className="size-4" /> {t("create")}
                </Button>
              </>
            )}
          </ActionForm>
        </CardBody>
      </Card>

      <DataTable
        rows={data.rows}
        columns={columns}
        rowKey={(r) => r.id}
        empty={
          <div className="card">
            <EmptyState title={t("empty")} description={t("emptyHint")} icon={<Link2 className="size-4" />} />
          </div>
        }
      />
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} basePath="/dashboard/approvals" searchParams={sp} />
      <CreatedLinkModal created={created} onClose={() => setCreated(null)} />
    </>
  );
}

/** Shows the new link once, with a copy button: only its hash is stored, so it can't be shown again. */
function CreatedLinkModal({ created, onClose }: { created: CreatedInvitation | null; onClose: () => void }) {
  const t = useTranslations("approvals.invitations");
  const input = useRef<HTMLInputElement>(null);
  const link = created ? inviteLink(created.token) : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t("copied"));
    } catch {
      input.current?.select();
      toast.error(t("copyFailed"));
    }
  };
  return (
    <Modal
      open={!!created}
      onClose={onClose}
      title={t("createdTitle")}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("done")}
          </Button>
          <Button onClick={copy} data-testid="copy-invite">
            <Copy className="size-4" /> {t("copy")}
          </Button>
        </>
      }
    >
      <p className="mb-4 flex items-start gap-2 rounded-xl bg-sun-soft p-3 text-sm font-semibold text-amber-800">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {t("createdText")}
      </p>
      <input ref={input} readOnly value={link} dir="ltr" onFocus={(e) => e.currentTarget.select()} className={cn(inputClasses, "font-mono text-xs")} aria-label={t("copy")} data-testid="invite-link" />
    </Modal>
  );
}

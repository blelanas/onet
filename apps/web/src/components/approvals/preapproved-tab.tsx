import { useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import { CheckCircle2, Clock, FileUp, ListPlus, Mail, Phone, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import type { approvalsPreapprovedPage } from "@api/modules/signup/routes";
import { relativeTime } from "@onet/shared";
import { deletePreapproved, importPreapproved, type ImportSummary } from "@/api/approvals";
import { useApi } from "@/lib/query";
import type { Loaded } from "@/lib/types";
import { QueryView } from "@/components/states/page-state";
import { ActionForm } from "@/components/ui/action-form";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, Textarea } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { FilterChips } from "@/components/ui/toolbar";
import { ApprovalTabs, Intro, RoleBadge, useFirstPageWhenPastEnd, formatPhone } from "./shared";

type Data = Loaded<typeof approvalsPreapprovedPage>;
type Row = Data["rows"][number];

export function PreapprovedTab({ sp }: { sp: Record<string, string | undefined> }) {
  const query = useApi<Data>("/approvals/preapproved", { filter: sp.filter, page: sp.page });
  return <QueryView query={query}>{(data) => <Preapproved data={data} sp={sp} />}</QueryView>;
}

/** Same limit as the server (characters of the whole list). */
const MAX_CHARS = 200_000;

function Preapproved({ data, sp }: { data: Data; sp: Record<string, string | undefined> }) {
  const t = useTranslations("approvals.preapproved");
  const tr = useTranslations("common.roles");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [text, setText] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const pastEnd = useFirstPageWhenPastEnd(data);

  // A .csv is read in the browser and pasted into the textarea: the user can review it before importing.
  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    // UTF-8 takes at most 4 bytes per character: a bigger file is too long without reading it.
    if (file.size > MAX_CHARS * 4) return toast.error(tc("errors.listTooLong"));
    const content = await file.text();
    const next = text.trim() ? `${text.trimEnd()}\n${content}` : content;
    if (next.trim().length > MAX_CHARS) return toast.error(tc("errors.listTooLong"));
    setText(next);
    toast.success(t("fileLoaded", { name: file.name }));
  };

  const columns: Column<Row>[] = [
    {
      key: "person",
      header: t("columns.person"),
      cell: (r) => (
        <span className="flex min-w-0 items-center gap-3">
          <Avatar name={r.name} />
          <span className="min-w-0">
            <span className="block truncate font-bold text-ink">{r.name}</span>
            <span className="flex flex-wrap gap-x-3 text-xs text-muted">
              {r.email && (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <Mail className="size-3 shrink-0" />
                  <span className="truncate" dir="ltr">
                    {r.email}
                  </span>
                </span>
              )}
              {r.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3 shrink-0" />
                  <span dir="ltr">{formatPhone(r.phone)}</span>
                </span>
              )}
            </span>
          </span>
        </span>
      ),
    },
    { key: "role", header: t("columns.role"), cell: (r) => <RoleBadge role={r.role} /> },
    {
      key: "status",
      header: t("columns.status"),
      cell: (r) =>
        r.usedBy ? (
          <span className="flex flex-col items-start gap-0.5">
            <Badge tone="success">
              <CheckCircle2 className="size-3.5" /> {t("activated")}
            </Badge>
            <span className="text-xs text-muted">{t("activatedBy", { name: r.usedBy.name, when: r.usedAt ? relativeTime(r.usedAt, locale) : "" })}</span>
          </span>
        ) : (
          <Badge tone="warning">
            <Clock className="size-3.5" /> {t("waiting")}
          </Badge>
        ),
    },
    {
      key: "actions",
      header: t("columns.actions"),
      align: "end",
      cell: (r) =>
        r.usedBy ? null : (
          <ConfirmButton action={() => deletePreapproved(r.id)} size="icon-sm" ariaLabel={`${t("remove")} — ${r.name}`} title={t("deleteTitle")} description={t("deleteText")} confirmLabel={t("remove")}>
            <Trash2 className="size-4 text-red-600" />
          </ConfirmButton>
        ),
    },
  ];

  return (
    <div data-testid="approvals-preapproved">
      <ApprovalTabs active="preapproved" counts={data.counts} />
      <Intro>{t("intro")}</Intro>
      <Card className="mb-5">
        <CardHeader title={t("importTitle")} icon={<ListPlus className="size-5" />} />
        <CardBody>
          <ActionForm
            action={importPreapproved}
            successMessage="toast.saved"
            onSuccess={(d) => {
              if (!d) return;
              setSummary(d);
              // Keep the list when some lines were skipped, so they can be fixed and imported again.
              if (d.added && !d.duplicates && !d.existingLines.length && !d.invalid.length) setText("");
            }}
            className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_260px]"
          >
            {(pending) => (
              <>
                <Textarea
                  name="text"
                  label={t("list")}
                  hint={t("format")}
                  rows={6}
                  maxLength={MAX_CHARS}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={"Hiba Mabrouk; hiba@exemple.tn; 97 300 411\nAnis Ben Amor;; +216 24 118 790"}
                  className="font-mono text-xs"
                  dir="auto"
                  required
                />
                <div className="flex flex-col gap-3">
                  <Select name="role" label={t("role")} options={[{ value: "monitor", label: tr("monitor") }, { value: "member", label: tr("member") }]} defaultValue="monitor" required />
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface-2/50 px-3 py-2.5 text-sm font-bold text-ink-2 transition hover:border-brand-300 hover:text-brand-700 focus-within:ring-4 focus-within:ring-brand-100">
                    <FileUp className="size-4" /> {t("file")}
                    <input
                      type="file"
                      accept=".csv,.txt,text/csv,text/plain"
                      className="sr-only"
                      onChange={(e) => {
                        void loadFile(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <Button type="submit" loading={pending} disabled={!text.trim()}>
                    <Upload className="size-4" /> {t("import")}
                  </Button>
                </div>
              </>
            )}
          </ActionForm>
          {summary && <ImportResult summary={summary} />}
        </CardBody>
      </Card>

      <FilterChips
        param="filter"
        allLabel={t("filters.all")}
        options={[
          { value: "waiting", label: t("filters.waiting") },
          { value: "used", label: t("filters.used") },
        ]}
        className="mb-4"
      />
      <DataTable
        rows={data.rows}
        columns={columns}
        rowKey={(r) => r.id}
        empty={
          pastEnd ? null : (
            <div className="card">
              <EmptyState title={t("empty")} description={t("emptyHint")} icon={<ListPlus className="size-4" />} />
            </div>
          )
        }
      />
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} basePath="/dashboard/approvals" searchParams={sp} />
    </div>
  );
}

function ImportResult({ summary }: { summary: ImportSummary }) {
  const t = useTranslations("approvals.preapproved");
  const lines = (l: number[]) => l.slice(0, 20).join(", ") + (l.length > 20 ? "…" : "");
  return (
    <div className="mt-4 rounded-2xl border border-line bg-surface-2/50 p-4 text-sm" role="status" data-testid="import-result">
      <p className="mb-2 font-extrabold text-ink">{t("resultTitle")}</p>
      <ul className="space-y-1">
        <li className="flex items-center gap-2 font-bold text-emerald-700">
          <CheckCircle2 className="size-4 shrink-0" /> {t("added", { count: summary.added })}
        </li>
        {summary.duplicates > 0 && <li className="text-ink-2">{t("duplicates", { count: summary.duplicates, lines: lines(summary.duplicateLines) })}</li>}
        {summary.existingLines.length > 0 && <li className="text-ink-2">{t("existing", { count: summary.existingLines.length, lines: lines(summary.existingLines) })}</li>}
        {summary.invalid.length > 0 && (
          <li className="text-red-700">
            <span className="font-bold">{t("invalid", { count: summary.invalid.length })}</span>
            <ul className="mt-1 list-disc ps-5 text-xs">
              {summary.invalid.slice(0, 20).map((i) => (
                <li key={i.line}>{t("invalidLine", { line: i.line, reason: t(`reasons.${i.reason}`) })}</li>
              ))}
            </ul>
          </li>
        )}
      </ul>
    </div>
  );
}

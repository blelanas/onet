import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { HeartPulse } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { ageFrom } from "@/lib/utils";
import type { Participant } from "@/server/registrations/queries";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { RegistrationQuickActions, TripRegistrationControls } from "./quick-actions";

/** Staff participant list for an event or a trip (status, payment, consent/documents, actions). */
export async function ParticipantsTable({ kind, rows, canManage, canFollowUp, showMoney }: { kind: "event" | "trip"; rows: Participant[]; canManage: boolean; canFollowUp?: boolean; showMoney: boolean }) {
  const t = await getTranslations("events");
  const tc = await getTranslations("common");
  const locale = await getLocale();

  const payment = (r: Participant) =>
    r.invoice ? (
      <span className="flex flex-col items-start gap-1">
        <StatusBadge status={r.invoice.status} />
        {showMoney && (
          <Link href={`/dashboard/finance/invoices/${r.invoice.id}`} className="text-xs leading-tight font-semibold whitespace-nowrap text-muted tabular-nums hover:text-brand-600">
            <span className="block text-ink-2">{formatMoney(r.invoice.amount, locale)}</span>
            <span className="block" dir="ltr">
              {r.invoice.number}
            </span>
          </Link>
        )}
      </span>
    ) : (
      <Badge tone="teal">{tc("fields.free")}</Badge>
    );

  const tripExtra = (r: Participant) =>
    "documentsStatus" in r ? <TripRegistrationControls id={r.id} parentConsent={r.parentConsent} documentsStatus={r.documentsStatus} disabled={!canFollowUp || r.status === "CANCELLED"} /> : null;

  const columns: Column<Participant>[] = [
    {
      key: "member",
      header: t("participants.member"),
      cell: (r) => (
        <span className="flex items-center gap-3">
          <Avatar firstName={r.member.firstName} lastName={r.member.lastName} src={r.member.photoUrl} />
          <span className="min-w-0">
            <Link href={`/dashboard/members/${r.member.id}`} className="block truncate font-bold text-ink hover:text-brand-600">
              {r.member.firstName} {r.member.lastName}
            </Link>
            <span className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted">
              {r.member.dateOfBirth && tc("fields.years", { count: ageFrom(r.member.dateOfBirth) ?? 0 })}
              {r.member.group && (
                <span className="truncate" style={{ color: r.member.group.color }}>
                  · {r.member.group.name}
                </span>
              )}
              {r.member.medicalNotes && <HeartPulse className="size-3.5 shrink-0 text-red-500" aria-label={t("participants.medical")} />}
            </span>
          </span>
        </span>
      ),
    },
    { key: "status", header: tc("fields.status"), cell: (r) => <StatusBadge status={r.status} /> },
    { key: "payment", header: t("participants.payment"), cell: payment },
    ...(kind === "trip" ? [{ key: "followup", header: t("participants.followUp"), cell: tripExtra }] : []),
    {
      key: "by",
      header: t("participants.registeredBy"),
      hideBelow: "xl",
      cell: (r) => (
        <span className="text-xs text-ink-2">
          <span className="block font-semibold whitespace-nowrap">{r.registeredBy?.name ?? "—"}</span>
          <span className="text-muted">{formatDate(r.createdAt, locale)}</span>
        </span>
      ),
    },
    ...(canManage ? [{ key: "actions", header: <span className="sr-only">{tc("fields.actions")}</span>, align: "end" as const, cell: (r: Participant) => <RegistrationQuickActions kind={kind} id={r.id} status={r.status} /> }] : []),
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.id}
      mobileCard={(r) => (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar firstName={r.member.firstName} lastName={r.member.lastName} src={r.member.photoUrl} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-ink">
                {r.member.firstName} {r.member.lastName}
              </p>
              <p className="text-xs text-muted">
                {r.member.dateOfBirth && tc("fields.years", { count: ageFrom(r.member.dateOfBirth) ?? 0 })} {r.member.group && `· ${r.member.group.name}`}
              </p>
            </div>
            <StatusBadge status={r.status} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {payment(r)}
            {canManage && <RegistrationQuickActions kind={kind} id={r.id} status={r.status} />}
          </div>
          {kind === "trip" && tripExtra(r)}
        </div>
      )}
      empty={
        <div className="card">
          <EmptyState compact title={t("participants.empty")} description={t("participants.emptyHint")} />
        </div>
      }
    />
  );
}

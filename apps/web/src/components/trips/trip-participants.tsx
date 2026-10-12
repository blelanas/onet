import { useLocale, useTranslations } from "use-intl";
import { useState } from "react";
import { Banknote, ChevronDown, Download, FileText, HeartPulse, Lock, Phone, Send, Unlock, UserMinus, Users, Wallet } from "lucide-react";
import { formatDate, formatMoney } from "@onet/shared";
import type { tripParticipantsPage } from "@api/modules/trips/routes";
import { download } from "@/lib/api";
import type { Loaded } from "@/lib/types";
import { cn } from "@/lib/utils";
import { finalizeTripList, removeTripParticipant, reopenTripList } from "@/api/trips";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { TripRegistrationControls } from "@/components/registrations/quick-actions";
import { AddTripParticipantButton } from "./add-trip-participant";
import { RecordTripPaymentButton } from "./record-trip-payment";

type Data = Loaded<typeof tripParticipantsPage>;
type Row = Data["rows"][number];

/** Participants tab for trip managers and admins: KPIs, list state, the list with payments, actions. */
export function TripParticipantsPanel({ tripId, data }: { tripId: string; data: Data }) {
  const t = useTranslations("trips.manage");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [showCancelled, setShowCancelled] = useState(false);
  const { rows, totals, capacity, price, closed, canManage, canReopen, unpaidCount, regManage } = data;
  const money = (v: number) => formatMoney(v, locale);
  const live = rows.filter((r) => r.status !== "CANCELLED");
  const cancelled = rows.filter((r) => r.status === "CANCELLED");
  const locked = !!closed;

  const finalizeText = [
    t("finalizeText", { count: totals.participants, collected: money(totals.collected) }),
    unpaidCount > 0 ? t("finalizeUnpaid", { count: unpaidCount, amount: money(totals.outstanding) }) : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label={t("kpi.participants")} value={totals.participants} icon={<Users className="size-5" />} accent="sky" hint={[t("capacity", { count: totals.participants, capacity }), totals.waitlist ? t("waitlist", { count: totals.waitlist }) : ""].filter(Boolean).join(" · ")} />
        <KpiCard label={t("kpi.expected")} value={<MoneyValue>{money(totals.expected)}</MoneyValue>} icon={<Wallet className="size-5" />} accent="grape" hint={price > 0 ? <span dir="ltr">{`${money(price)} × ${totals.participants}`}</span> : t("free")} />
        <KpiCard label={t("kpi.collected")} value={<MoneyValue>{money(totals.collected)}</MoneyValue>} icon={<Banknote className="size-5" />} accent="leaf" />
        <KpiCard label={t("kpi.outstanding")} value={<MoneyValue>{money(totals.outstanding)}</MoneyValue>} icon={<Wallet className="size-5" />} accent="sun" />
      </div>

      {closed && (
        <section className="card flex flex-col gap-3 border-s-4 border-s-brand-600 p-4 sm:flex-row sm:items-center">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <Lock className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-ink">
              {t("lockedTitle", { date: formatDate(closed.at, locale, "long") })} {closed.by && <span className="font-semibold text-ink-2">{t("lockedBy", { name: closed.by })}</span>}
            </p>
            <p className="text-sm text-muted">
              {t("lockedText")} {canReopen && t("lockedAdmin")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`/dashboard/trips/${tripId}/report`} variant="outline" size="sm">
              <FileText className="size-4" /> {t("report")}
            </LinkButton>
            {canReopen && (
              <ConfirmButton action={reopenTripList.bind(null, tripId)} variant="outline" size="sm" tone="primary" title={t("reopenTitle")} description={t("reopenText")} confirmLabel={t("reopen")} successMessage="toast.saved">
                <Unlock className="size-4" /> {t("reopen")}
              </ConfirmButton>
            )}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={() => void download(`/trips/${tripId}/participants/export.csv`)}>
          <Download className="size-4" /> <span className="hidden sm:inline">{tc("actions.exportCsv")}</span>
        </Button>
        {!locked && (
          <LinkButton href={`/dashboard/trips/${tripId}/report`} variant="outline">
            <FileText className="size-4" /> <span className="hidden sm:inline">{t("report")}</span>
          </LinkButton>
        )}
        {canManage && !locked && <AddTripParticipantButton tripId={tripId} />}
        {canManage && !locked && (
          <ConfirmButton
            action={finalizeTripList.bind(null, tripId)}
            variant="secondary"
            size="md"
            tone="primary"
            title={t("finalizeTitle")}
            description={finalizeText}
            confirmLabel={t("finalizeConfirm")}
            disabled={totals.participants === 0}
            className="w-full sm:w-auto"
          >
            <Send className="rtl-flip size-4" /> <span className="min-w-0 truncate">{t("finalize")}</span>
          </ConfirmButton>
        )}
      </div>

      <ParticipantsTable tripId={tripId} rows={live} canManage={canManage} canFollowUp={canManage || regManage} locked={locked} />

      {cancelled.length > 0 && (
        <section className="card overflow-hidden">
          <button type="button" onClick={() => setShowCancelled((v) => !v)} aria-expanded={showCancelled} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start text-sm font-bold text-ink-2 hover:bg-surface-2">
            {t("showCancelled", { count: cancelled.length })}
            <ChevronDown className={cn("size-4 transition", showCancelled && "rotate-180")} />
          </button>
          {showCancelled && (
            <ul className="divide-y divide-line border-t border-line">
              {cancelled.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate font-semibold text-ink-2">
                    {r.member.firstName} {r.member.lastName}
                  </span>
                  {r.paid > 0 && <span className="text-xs font-bold text-amber-700 tabular-nums">{money(r.paid)}</span>}
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

/** Amounts are long ("1 234,500 DT"): a smaller size on phones so two KPI cards fit side by side. */
function MoneyValue({ children }: { children: React.ReactNode }) {
  return <span className="block text-lg break-words sm:text-2xl lg:text-3xl">{children}</span>;
}

function ParticipantsTable({ tripId, rows, canManage, canFollowUp, locked }: { tripId: string; rows: Row[]; canManage: boolean; canFollowUp: boolean; locked: boolean }) {
  const t = useTranslations("trips.manage");
  const tc = useTranslations("common");
  const locale = useLocale();
  const money = (v: number) => formatMoney(v, locale);
  const name = (r: Row) => `${r.member.firstName} ${r.member.lastName}`;

  const who = (r: Row) => (
    <span className="flex items-center gap-3">
      <Avatar firstName={r.member.firstName} lastName={r.member.lastName} src={r.member.photoUrl} />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 font-bold text-ink">
          <span className="truncate">{name(r)}</span>
          {r.member.medicalNotes && <HeartPulse className="size-3.5 shrink-0 text-red-500" aria-label={r.member.medicalNotes} />}
        </span>
        {r.guardian && <span className="block truncate text-xs text-muted">{t("guardian", { name: r.guardian.name })}</span>}
      </span>
    </span>
  );
  const phone = (r: Row) =>
    r.phone ? (
      <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 text-sm font-semibold whitespace-nowrap text-brand-700 hover:underline" dir="ltr">
        <Phone className="size-3.5" /> {r.phone}
      </a>
    ) : (
      <span className="text-muted">—</span>
    );
  const type = (r: Row) => (
    <Badge tone={r.type === "kid" ? "warning" : "violet"} className="py-0">
      {t(`types.${r.type}`)}
    </Badge>
  );
  const amounts = (r: Row) =>
    r.invoice ? (
      <span className="grid grid-cols-[auto_auto] gap-x-3 text-xs leading-5 whitespace-nowrap tabular-nums">
        <span className="text-muted">{t("columns.due")}</span>
        <span className="text-end font-semibold text-ink">{money(r.amountDue)}</span>
        <span className="text-muted">{t("columns.paid")}</span>
        <span className="text-end font-semibold text-emerald-700">{money(r.paid)}</span>
        <span className="text-muted">{t("columns.remaining")}</span>
        <span className={cn("text-end font-extrabold", r.remaining ? "text-amber-700" : "text-emerald-700")}>{r.remaining ? money(r.remaining) : t("settled")}</span>
      </span>
    ) : (
      <Badge tone="teal">{t("free")}</Badge>
    );
  const actions = (r: Row) =>
    canManage ? (
      <span className="flex items-center justify-end gap-1">
        {r.invoice && r.remaining > 0 && <RecordTripPaymentButton tripId={tripId} registrationId={r.id} name={name(r)} remaining={r.remaining} compact />}
        {!locked && (
          <ConfirmButton
            action={removeTripParticipant.bind(null, tripId, r.id)}
            size="icon-sm"
            variant="ghost"
            ariaLabel={`${t("remove")} — ${name(r)}`}
            title={t("removeTitle", { name: name(r) })}
            description={t("removeText")}
            confirmLabel={t("remove")}
            successMessage="toast.cancelled"
            className="text-red-600 hover:bg-red-50"
          >
            <UserMinus className="size-4" />
          </ConfirmButton>
        )}
      </span>
    ) : null;

  const columns: Column<Row>[] = [
    { key: "member", header: t("columns.participant"), cell: who },
    { key: "age", header: t("columns.age"), cell: (r) => (r.age != null ? <span className="tabular-nums">{r.age}</span> : "—") },
    { key: "phone", header: t("columns.phone"), cell: phone },
    { key: "type", header: t("columns.type"), cell: type, hideBelow: "lg" },
    { key: "money", header: `${t("columns.due")} / ${t("columns.paid")}`, cell: amounts },
    { key: "status", header: t("columns.status"), cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: "followup",
      header: t("columns.followUp"),
      hideBelow: "xl",
      cell: (r) => <TripRegistrationControls id={r.id} parentConsent={r.parentConsent} documentsStatus={r.documentsStatus} disabled={!canFollowUp} />,
    },
    ...(canManage ? [{ key: "actions", header: <span className="sr-only">{tc("fields.actions")}</span>, align: "end" as const, cell: actions }] : []),
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.id}
      mobileCard={(r) => (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">{who(r)}</div>
            <StatusBadge status={r.status} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            {type(r)}
            {r.age != null && <span>{t("years", { count: r.age })}</span>}
            {phone(r)}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-2">
            {amounts(r)}
            {actions(r)}
          </div>
          <TripRegistrationControls id={r.id} parentConsent={r.parentConsent} documentsStatus={r.documentsStatus} disabled={!canFollowUp} />
        </div>
      )}
      empty={
        <div className="card">
          <EmptyState compact title={t("empty")} description={t("emptyHint")} icon={<Users className="size-4" />} action={canManage && !locked ? <AddTripParticipantButton tripId={tripId} /> : undefined} />
        </div>
      }
    />
  );
}

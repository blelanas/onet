"use client";
import { useTranslations } from "next-intl";
import { Check, Hourglass, X } from "lucide-react";
import { cancelRegistrationAction, setRegistrationStatusAction, updateTripRegistration } from "@/server/registrations/actions";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { DOCUMENTS_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ActionButton, ConfirmButton } from "@/components/ui/confirm-button";

/** Staff quick actions on one registration (confirm / waitlist / cancel). */
export function RegistrationQuickActions({ kind, id, status }: { kind: "event" | "trip"; id: string; status: string }) {
  const t = useTranslations("events");
  if (status === "CANCELLED") return null;
  return (
    <div className="flex items-center justify-end gap-1">
      {status !== "CONFIRMED" && (
        <ActionButton action={setRegistrationStatusAction.bind(null, kind, id, "CONFIRMED")} size="icon-sm" variant="ghost" ariaLabel={t("actions.confirm")} className="text-emerald-700 hover:bg-leaf-soft">
          <Check className="size-4" />
        </ActionButton>
      )}
      {status !== "WAITLIST" && (
        <ActionButton action={setRegistrationStatusAction.bind(null, kind, id, "WAITLIST")} size="icon-sm" variant="ghost" ariaLabel={t("actions.waitlist")} className="text-violet-700 hover:bg-grape-soft">
          <Hourglass className="size-4" />
        </ActionButton>
      )}
      <ConfirmButton action={cancelRegistrationAction.bind(null, kind, id)} size="icon-sm" variant="ghost" ariaLabel={t("actions.cancelRegistration")} title={t("cancel.title")} description={t("cancel.staffText")} confirmLabel={t("cancel.confirm")} successMessage="toast.cancelled" className="text-red-600 hover:bg-red-50">
        <X className="size-4" />
      </ConfirmButton>
    </div>
  );
}

/** Inline consent toggle + documents status for a trip registration (auto-saves). */
export function TripRegistrationControls({ id, parentConsent, documentsStatus, disabled }: { id: string; parentConsent: boolean; documentsStatus: string; disabled?: boolean }) {
  const t = useTranslations("trips");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const save = (patch: { parentConsent?: boolean; documentsStatus?: string }) =>
    start(async () => {
      const res = await updateTripRegistration(id, patch);
      if (res.ok) {
        toast.success(tc("toast.saved"));
        router.refresh();
      } else toast.error(tc(res.error.startsWith("errors.") ? res.error : "errors.unexpected"));
    });
  const docTone: Record<string, string> = { MISSING: "border-red-200 bg-red-50 text-red-700", PARTIAL: "border-amber-200 bg-sun-soft text-amber-800", COMPLETE: "border-emerald-200 bg-leaf-soft text-emerald-700" };
  return (
    <div className={cn("flex flex-wrap items-center gap-2", pending && "opacity-60")}>
      <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-ink-2">
        <input type="checkbox" className="size-4 cursor-pointer accent-emerald-600" checked={parentConsent} disabled={disabled || pending} onChange={(e) => save({ parentConsent: e.target.checked })} />
        {t("participants.consent")}
      </label>
      <select
        aria-label={t("participants.documents")}
        value={documentsStatus}
        disabled={disabled || pending}
        onChange={(e) => save({ documentsStatus: e.target.value })}
        className={cn("cursor-pointer rounded-full border px-2.5 py-1 text-xs font-bold focus:ring-2 focus:ring-brand-100 focus:outline-none", docTone[documentsStatus])}
      >
        {DOCUMENTS_STATUSES.map((s) => (
          <option key={s} value={s}>
            {t("participants.docs")} : {tc(`status.${s}`)}
          </option>
        ))}
      </select>
    </div>
  );
}

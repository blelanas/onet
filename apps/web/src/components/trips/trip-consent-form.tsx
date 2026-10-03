import { useTranslations } from "use-intl";
import { useState } from "react";
import { FileSignature, Ticket } from "lucide-react";
import { registerMembers } from "@/api/registrations";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";

/** Step 3 → 4: parental consent + register one child to a trip. */
export function TripConsentForm({ tripId, memberId, childName, tripTitle, priceLabel, full }: { tripId: string; memberId: string; childName: string; tripTitle: string; priceLabel: string; full: boolean }) {
  const t = useTranslations("trips");
  const [consent, setConsent] = useState(false);
  return (
    <ActionForm action={registerMembers} className="space-y-4">
      {(pending) => (
        <>
          <input type="hidden" name="kind" value="trip" />
          <input type="hidden" name="targetId" value={tripId} />
          <input type="hidden" name="memberIds[]" value={memberId} />
          <label className={`flex cursor-pointer gap-3 rounded-2xl border-2 p-4 transition ${consent ? "border-emerald-300 bg-leaf-soft/60" : "border-dashed border-line bg-surface hover:border-brand-200"}`}>
            <input type="checkbox" name="parentConsent" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-5 shrink-0 cursor-pointer accent-emerald-600" />
            <span>
              <span className="flex items-center gap-2 font-bold text-ink">
                <FileSignature className="size-4 text-emerald-600" /> {t("flow.consentTitle")}
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-ink-2">{t("flow.consentText", { name: childName, title: tripTitle })}</span>
            </span>
          </label>
          <div className="flex flex-col gap-3 rounded-2xl bg-surface-2/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold tracking-wide text-muted uppercase">{t("flow.toPay")}</p>
              <p className="font-display text-2xl font-extrabold text-ink tabular-nums">{priceLabel}</p>
            </div>
            <Button type="submit" size="lg" loading={pending} disabled={!consent} className="w-full sm:w-auto">
              <Ticket className="size-5" /> {full ? t("flow.joinWaitlist", { name: childName }) : t("flow.register", { name: childName })}
            </Button>
          </div>
        </>
      )}
    </ActionForm>
  );
}

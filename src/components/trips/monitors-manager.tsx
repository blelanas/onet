"use client";
import { useTranslations } from "next-intl";
import { UserPlus, X } from "lucide-react";
import { addTripMonitor, removeTripMonitor } from "@/server/trips/actions";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Select } from "@/components/ui/input";

/** Assign a monitor to a trip (staff). */
export function AddMonitorForm({ tripId, options }: { tripId: string; options: { id: string; firstName: string; lastName: string }[] }) {
  const t = useTranslations("trips");
  if (!options.length) return null;
  return (
    <ActionForm action={addTripMonitor} successMessage="toast.saved" resetOnSuccess className="mt-4 flex items-end gap-2 border-t border-line pt-4">
      {(pending) => (
        <>
          <input type="hidden" name="tripId" value={tripId} />
          <Select name="memberId" label={t("monitors.assign")} placeholder="—" required options={options.map((o) => ({ value: o.id, label: `${o.firstName} ${o.lastName}` }))} wrapperClassName="flex-1 min-w-0" />
          <Button type="submit" size="icon" loading={pending} aria-label={t("monitors.assign")}>
            {!pending && <UserPlus className="size-4" />}
          </Button>
        </>
      )}
    </ActionForm>
  );
}

export function RemoveMonitorButton({ tripId, memberId, name }: { tripId: string; memberId: string; name: string }) {
  const t = useTranslations("trips");
  return (
    <ConfirmButton action={removeTripMonitor.bind(null, tripId, memberId)} size="icon-sm" variant="ghost" ariaLabel={t("monitors.remove", { name })} title={t("monitors.remove", { name })} description={t("monitors.removeText")} successMessage="toast.saved">
      <X className="size-4 text-muted" />
    </ConfirmButton>
  );
}

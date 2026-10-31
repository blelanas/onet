import { useTranslations } from "use-intl";
import { Phone, UserPlus, X } from "lucide-react";
import { addTripMonitor, removeTripMonitor } from "@/api/trips";
import { ActionForm } from "@/components/ui/action-form";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Select } from "@/components/ui/input";

type Manager = { memberId: string; firstName: string; lastName: string; photoUrl: string | null; phone: string | null };

/**
 * Trip managers (TripMonitor): they build the participant list, collect payments and finalize it.
 * Admins (trips.manage) add / remove them; candidates are members, monitors and staff.
 */
export function TripManagers({ tripId, managers, options, canEdit }: { tripId: string; managers: Manager[]; options: { id: string; firstName: string; lastName: string }[]; canEdit: boolean }) {
  const t = useTranslations("trips");
  return (
    <>
      {managers.length ? (
        <ul className="space-y-2">
          {managers.map((m) => (
            <li key={m.memberId} className="flex items-center gap-3 rounded-2xl border border-line p-2.5">
              <Avatar firstName={m.firstName} lastName={m.lastName} src={m.photoUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">
                  {m.firstName} {m.lastName}
                </p>
                {/* The API only sends phone numbers to staff and families with a confirmed child. */}
                {m.phone && (
                  <a href={`tel:${m.phone}`} className="flex items-center gap-1 text-xs font-semibold text-brand-700" dir="ltr">
                    <Phone className="size-3" /> {m.phone}
                  </a>
                )}
              </div>
              {canEdit && <RemoveManagerButton tripId={tripId} memberId={m.memberId} name={`${m.firstName} ${m.lastName}`} />}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{t(canEdit ? "managers.none" : "detail.noMonitors")}</p>
      )}
      {canEdit && <p className="mt-3 text-xs text-muted">{t("managers.hint")}</p>}
      {canEdit && <AddManagerForm tripId={tripId} options={options} />}
    </>
  );
}

/** Assign a trip manager (admins). */
export function AddManagerForm({ tripId, options }: { tripId: string; options: { id: string; firstName: string; lastName: string }[] }) {
  const t = useTranslations("trips");
  if (!options.length) return null;
  return (
    <ActionForm action={addTripMonitor} successMessage="toast.saved" resetOnSuccess className="mt-4 flex items-end gap-2 border-t border-line pt-4">
      {(pending) => (
        <>
          <input type="hidden" name="tripId" value={tripId} />
          <Select name="memberId" label={t("managers.assign")} placeholder="—" required options={options.map((o) => ({ value: o.id, label: `${o.firstName} ${o.lastName}` }))} wrapperClassName="flex-1 min-w-0" />
          <Button type="submit" size="icon" loading={pending} aria-label={t("managers.assign")}>
            {!pending && <UserPlus className="size-4" />}
          </Button>
        </>
      )}
    </ActionForm>
  );
}

export function RemoveManagerButton({ tripId, memberId, name }: { tripId: string; memberId: string; name: string }) {
  const t = useTranslations("trips");
  return (
    <ConfirmButton action={removeTripMonitor.bind(null, tripId, memberId)} size="icon-sm" variant="ghost" ariaLabel={t("managers.remove", { name })} title={t("managers.remove", { name })} description={t("managers.removeText")} successMessage="toast.saved">
      <X className="size-4 text-muted" />
    </ConfirmButton>
  );
}

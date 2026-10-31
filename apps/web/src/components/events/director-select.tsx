import { useState } from "react";
import { useTranslations } from "use-intl";
import type { directorCandidatesPage } from "@api/modules/events/routes";
import { useApi } from "@/lib/query";
import type { Loaded } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/input";
import { useFieldError } from "@/components/ui/form-context";

type Person = { id: string; firstName: string; lastName: string; photoUrl: string | null; type: string };

/**
 * Director picker of the event forms (admins): the team candidates (ACTIVE animators), optional ("no
 * director"). The value travels in a hidden input, so a slow candidates list never clears the current
 * director; `current` keeps a director who is no longer a candidate selectable (the API keeps them).
 */
export function DirectorSelect({ defaultValue, current, hint, className }: { defaultValue?: string | null; current?: Person | null; hint?: string; className?: string }) {
  const t = useTranslations("events.director");
  const tc = useTranslations("common");
  const [value, setValue] = useState(defaultValue ?? "");
  const error = useFieldError("directorId");
  const query = useApi<Loaded<typeof directorCandidatesPage>>("/events/director-candidates");
  const candidates: Person[] = query.data?.candidates ?? [];
  const people = current && !candidates.some((c) => c.id === current.id) ? [current, ...candidates] : candidates;
  const chosen = people.find((p) => p.id === value) ?? null;
  return (
    <div className={className}>
      {/* Until the list is loaded (or if it failed), the field is left out: the API then keeps the current director. */}
      {(chosen || !value) && <input type="hidden" name="directorId" value={value} />}
      <div className="flex items-end gap-3">
        <Select
          label={t("label")}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("none")}
          disabled={query.isPending}
          error={error}
          options={people.map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName} · ${tc(`enums.memberType.${p.type}`)}` }))}
          wrapperClassName="min-w-0 flex-1"
        />
        {chosen && (
          <span className="pb-1">
            <Avatar firstName={chosen.firstName} lastName={chosen.lastName} src={chosen.photoUrl} />
          </span>
        )}
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

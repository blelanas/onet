import { useTranslations } from "use-intl";
import { useState } from "react";
import { saveMember } from "@/api/members";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Field, inputClasses } from "@/components/ui/input";
import { Upload } from "@/components/ui/upload";
import { GENDERS, MEMBER_TYPES, MEMBERSHIP_STATUSES } from "@onet/shared";
import { toDateInput } from "@onet/shared";

export type MemberFormValues = {
  id?: string;
  type: string;
  firstName?: string;
  lastName?: string;
  firstNameAr?: string | null;
  lastNameAr?: string | null;
  dateOfBirth?: Date | string | null;
  gender?: string | null;
  photoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  emergencyName?: string | null;
  emergencyPhone?: string | null;
  membershipStatus?: string;
  membershipDate?: Date | string | null;
  groupId?: string | null;
  notes?: string | null;
  medicalNotes?: string | null;
  parentIds?: string[];
  monitorGroupIds?: string[];
};

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-bold text-ink">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function MemberForm({ initial, parents, groups }: { initial: MemberFormValues; parents: { id: string; firstName: string; lastName: string }[]; groups: { id: string; name: string }[] }) {
  const t = useTranslations("people.form");
  const tc = useTranslations("common");
  const [type, setType] = useState(initial.type);

  return (
    <ActionForm action={saveMember} successMessage={initial.id ? "toast.saved" : "toast.created"} redirectTo={(d) => `/dashboard/members/${d?.id}`} className="space-y-5">
      {(pending) => (
        <>
          {initial.id && <input type="hidden" name="id" value={initial.id} />}
          <FormSection title={t("identity")}>
            <Select name="type" label={t("type")} value={type} onChange={(e) => setType(e.target.value)} options={MEMBER_TYPES.map((v) => ({ value: v, label: tc(`enums.memberType.${v}`) }))} required />
            <Select name="gender" label={t("gender")} defaultValue={initial.gender ?? ""} placeholder="—" options={GENDERS.map((v) => ({ value: v, label: tc(`enums.gender.${v}`) }))} />
            <Input name="firstName" label={t("firstName")} defaultValue={initial.firstName} required autoComplete="off" />
            <Input name="lastName" label={t("lastName")} defaultValue={initial.lastName} required autoComplete="off" />
            <Input name="firstNameAr" label={t("firstNameAr")} defaultValue={initial.firstNameAr ?? ""} dir="rtl" lang="ar" />
            <Input name="lastNameAr" label={t("lastNameAr")} defaultValue={initial.lastNameAr ?? ""} dir="rtl" lang="ar" />
            <Input name="dateOfBirth" type="date" label={t("dateOfBirth")} defaultValue={toDateInput(initial.dateOfBirth)} />
            <Upload name="photoUrl" kind="image" label={t("photo")} defaultValue={initial.photoUrl} />
          </FormSection>

          {(type === "CHILD" || type === "MONITOR") && (
            <FormSection title={t("family")}>
              {type === "CHILD" ? (
                <>
                  <Select name="groupId" label={t("group")} defaultValue={initial.groupId ?? ""} placeholder={t("noGroup")} options={groups.map((g) => ({ value: g.id, label: g.name }))} />
                  <Field label={t("parents")} hint={t("parentsHint")} name="parentIds">
                    {(id) => (
                      <select id={id} name="parentIds[]" multiple defaultValue={initial.parentIds} className={`${inputClasses} h-32`}>
                        {parents.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.lastName} {p.firstName}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                </>
              ) : (
                <Field label={t("monitorGroups")} hint={t("parentsHint")} name="monitorGroupIds" className="sm:col-span-2">
                  {(id) => (
                    <select id={id} name="monitorGroupIds[]" multiple defaultValue={initial.monitorGroupIds} className={`${inputClasses} h-32`}>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              )}
            </FormSection>
          )}

          <FormSection title={t("contact")}>
            <Input name="phone" type="tel" label={tc("fields.phone")} defaultValue={initial.phone ?? ""} dir="ltr" />
            <Input name="email" type="email" label={tc("fields.email")} defaultValue={initial.email ?? ""} dir="ltr" />
            <Input name="address" label={tc("fields.address")} defaultValue={initial.address ?? ""} />
            <Input name="city" label={t("city")} defaultValue={initial.city ?? "Teboulba"} />
          </FormSection>

          <FormSection title={t("health")}>
            <Input name="emergencyName" label={t("emergencyName")} defaultValue={initial.emergencyName ?? ""} />
            <Input name="emergencyPhone" type="tel" label={t("emergencyPhone")} defaultValue={initial.emergencyPhone ?? ""} dir="ltr" />
            <Textarea name="medicalNotes" label={t("medicalNotes")} hint={t("medicalHint")} defaultValue={initial.medicalNotes ?? ""} rows={3} wrapperClassName="sm:col-span-2" />
          </FormSection>

          <FormSection title={t("membership")}>
            <Select name="membershipStatus" label={t("status")} defaultValue={initial.membershipStatus ?? "ACTIVE"} options={MEMBERSHIP_STATUSES.map((v) => ({ value: v, label: tc(`status.${v}`) }))} />
            <Input name="membershipDate" type="date" label={t("membershipDate")} defaultValue={toDateInput(initial.membershipDate ?? new Date())} />
            <Textarea name="notes" label={t("notes")} defaultValue={initial.notes ?? ""} rows={3} wrapperClassName="sm:col-span-2" />
          </FormSection>

          <div className="sticky bottom-20 z-10 flex justify-end gap-2 rounded-2xl border border-line bg-surface/90 p-3 shadow-[var(--shadow-lift)] backdrop-blur lg:bottom-4">
            <Button variant="outline" onClick={() => history.back()}>
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" loading={pending}>
              {tc("actions.save")}
            </Button>
          </div>
        </>
      )}
    </ActionForm>
  );
}

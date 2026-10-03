import { useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { HeartPulse, UserMinus, Users } from "lucide-react";
import type { groupMembersTab } from "@api/modules/groups/routes";
import { can, useMe } from "@/lib/auth";
import { useApi } from "@/lib/query";
import type { Loaded } from "@/lib/types";
import { ageFrom, cn } from "@/lib/utils";
import { addChildToGroup, removeChildFromGroup } from "@/api/groups";
import { QueryView } from "@/components/states/page-state";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import { ChildPicker } from "../child-picker";
import { TabSkeleton } from "../grid-skeleton";
import type { Group } from "../types";

type Data = Loaded<typeof groupMembersTab>;

export function MembersTab({ group }: { group: Group }) {
  const query = useApi<Data>(`/groups/${group.id}/members`);
  return <QueryView query={query} skeleton={<TabSkeleton />}>{(data) => <MembersPanel group={group} data={data} />}</QueryView>;
}

function MembersPanel({ group, data }: { group: Group; data: Data }) {
  const t = useTranslations("groups.members");
  const tc = useTranslations("common");
  const user = useMe();
  const canManage = can(user, "groups.manage");
  const { children, candidates } = data;
  const full = children.length >= group.capacity;

  return (
    <Section
      title={t("title", { count: children.length })}
      action={
        canManage ? (
          <ChildPicker
            action={addChildToGroup.bind(null, group.id)}
            labels={{ button: t("add"), title: t("addTitle"), hint: t("addHint"), success: t("added") }}
            full={full}
            ageMin={group.ageMin}
            ageMax={group.ageMax}
            candidates={candidates.map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName, photoUrl: c.photoUrl, age: ageFrom(c.dateOfBirth), group: c.group }))}
          />
        ) : undefined
      }
    >
      {full && canManage && <p className="mb-4 rounded-xl bg-sun-soft px-3 py-2 text-sm font-semibold text-amber-800">{t("fullHint", { capacity: group.capacity })}</p>}
      {children.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {children.map((c) => {
            const rate = c.rate;
            return (
              <li key={c.id} className="group relative flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition hover:border-transparent hover:shadow-[var(--shadow-lift)]">
                <Avatar firstName={c.firstName} lastName={c.lastName} src={c.photoUrl} size="lg" />
                <div className="min-w-0 flex-1">
                  <Link href={`/dashboard/members/${c.id}`} className="block truncate font-bold text-ink after:absolute after:inset-0 hover:text-brand-700">
                    {c.firstName} {c.lastName}
                  </Link>
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    {c.dateOfBirth && tc("fields.years", { count: ageFrom(c.dateOfBirth) ?? 0 })}
                    {c.medical && (
                      <span className="inline-flex items-center gap-0.5 font-bold text-red-600" title={t("medical")}>
                        <HeartPulse className="size-3.5" />
                        <span className="sr-only">{t("medical")}</span>
                      </span>
                    )}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {c.membershipStatus !== "ACTIVE" && <StatusBadge status={c.membershipStatus} />}
                    {rate !== null && (
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-extrabold", rate >= 80 ? "bg-leaf-soft text-emerald-700" : rate >= 60 ? "bg-sun-soft text-amber-700" : "bg-red-50 text-red-700")}>
                        {t("rate", { rate })}
                      </span>
                    )}
                  </div>
                </div>
                {canManage && (
                  <div className="relative z-10">
                    <ConfirmButton action={removeChildFromGroup.bind(null, group.id, c.id)} size="icon-sm" title={t("removeTitle")} description={t("removeText", { name: c.firstName })} confirmLabel={tc("actions.remove")} successMessage="toast.saved" ariaLabel={`${tc("actions.remove")} ${c.firstName}`}>
                      <UserMinus className="size-4 text-muted" />
                    </ConfirmButton>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState compact title={t("empty")} description={canManage ? t("emptyHint") : undefined} icon={<Users className="size-4" />} />
      )}
    </Section>
  );
}

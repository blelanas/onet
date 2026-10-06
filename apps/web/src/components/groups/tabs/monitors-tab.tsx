import { useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { Crown, Mail, MessageCircle, Phone, ShieldCheck, Trash2 } from "lucide-react";
import type { groupMonitorsTab } from "@api/modules/groups/routes";
import { can, useMe } from "@/lib/auth";
import { useApi } from "@/lib/query";
import type { Loaded } from "@/lib/types";
import { removeMonitor, setLeadMonitor } from "@/api/groups";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { ActionButton, ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { AssignMonitorForm } from "../group-forms";

import type { Group } from "../types";

type Data = Loaded<typeof groupMonitorsTab>;

export function MonitorsTab({ group }: { group: Group }) {
  const t = useTranslations("groups.monitors");
  const tc = useTranslations("common");
  const user = useMe();
  const canManage = can(user, "groups.manage");
  // Assignable monitors are only loaded for managers (the list itself comes with the group).
  const query = useApi<Data>(canManage ? `/groups/${group.id}/monitors` : null);
  const candidates = (query.data?.candidates ?? []).filter((m) => !group.monitors.some((gm) => gm.memberId === m.id));

  return (
    <Section title={t("title")}>
      {group.monitors.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {group.monitors.map((gm) => (
            <li key={gm.memberId} className="relative flex items-start gap-3 overflow-hidden rounded-2xl border border-line p-4" style={gm.isLead ? { background: `linear-gradient(135deg, ${group.color}14, transparent 60%)` } : undefined}>
              <Avatar firstName={gm.member.firstName} lastName={gm.member.lastName} src={gm.member.photoUrl} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/dashboard/members/${gm.memberId}`} className="truncate font-bold text-ink hover:text-brand-700">
                    {gm.member.firstName} {gm.member.lastName}
                  </Link>
                  {gm.isLead && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold text-white" style={{ background: group.color }}>
                      <Crown className="size-3" /> {t("leadBadge")}
                    </span>
                  )}
                </div>
                <div className="mt-1 space-y-0.5 text-xs text-ink-2">
                  {gm.member.phone && (
                    <a href={`tel:${gm.member.phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 hover:text-brand-700" dir="ltr">
                      <Phone className="size-3.5" /> {gm.member.phone}
                    </a>
                  )}
                  {gm.member.email && (
                    <a href={`mailto:${gm.member.email}`} className="flex items-center gap-1.5 truncate hover:text-brand-700">
                      <Mail className="size-3.5" /> {gm.member.email}
                    </a>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {gm.member.userId && gm.member.userId !== user.id && can(user, "messages.use") && (
                    <Link href={`/dashboard/messages?to=${gm.member.userId}`} className={buttonClasses("soft", "sm")}>
                      <MessageCircle className="size-4" /> {t("message")}
                    </Link>
                  )}
                  {canManage && !gm.isLead && (
                    <ActionButton action={setLeadMonitor.bind(null, group.id, gm.memberId)} variant="outline">
                      <Crown className="size-4" /> {t("makeLead")}
                    </ActionButton>
                  )}
                </div>
              </div>
              {canManage && (
                <ConfirmButton action={removeMonitor.bind(null, group.id, gm.memberId)} size="icon-sm" title={t("removeTitle")} description={t("removeText", { name: gm.member.firstName })} confirmLabel={tc("actions.remove")} successMessage="toast.saved" ariaLabel={tc("actions.remove")}>
                  <Trash2 className="size-4 text-muted" />
                </ConfirmButton>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState compact title={t("empty")} icon={<ShieldCheck className="size-4" />} />
      )}
      {canManage && <AssignMonitorForm groupId={group.id} options={candidates} />}
    </Section>
  );
}

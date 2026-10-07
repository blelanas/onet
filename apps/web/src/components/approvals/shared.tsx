import { useTranslations } from "use-intl";
import { ROLE_COLORS, ROLE_KEYS, type RoleKey } from "@onet/shared";
import { Badge } from "@/components/ui/badge";
import { LinkTabs } from "@/components/ui/tabs";

export type ApprovalCounts = { pending: number; invitations: number; preapproved: number };

/** The three tabs of the Approvals page, with their counters (state in ?tab=). */
export function ApprovalTabs({ active, counts }: { active: "pending" | "invitations" | "preapproved"; counts: ApprovalCounts }) {
  const t = useTranslations("approvals.tabs");
  return (
    <LinkTabs
      active={active}
      tabs={[
        { key: "pending", label: t("pending"), href: "/dashboard/approvals", count: counts.pending },
        { key: "invitations", label: t("invitations"), href: "/dashboard/approvals?tab=invitations", count: counts.invitations },
        { key: "preapproved", label: t("preapproved"), href: "/dashboard/approvals?tab=preapproved", count: counts.preapproved },
      ]}
    />
  );
}

/** Explanatory text under the tabs. */
export function Intro({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 max-w-3xl text-sm text-muted">{children}</p>;
}

/** "21697300411" → "+216 97 300 411" (other countries: "+" and the digits). */
export function formatPhone(digits: string | null) {
  if (!digits) return null;
  const m = /^216(\d{2})(\d{3})(\d{3})$/.exec(digits);
  return m ? `+216 ${m[1]} ${m[2]} ${m[3]}` : `+${digits}`;
}

/** Role pill in the role's colour. */
export function RoleBadge({ role }: { role: string }) {
  const t = useTranslations("common.roles");
  const known = (ROLE_KEYS as readonly string[]).includes(role);
  return <Badge color={known ? ROLE_COLORS[role as RoleKey] : undefined}>{known ? t(role) : role}</Badge>;
}

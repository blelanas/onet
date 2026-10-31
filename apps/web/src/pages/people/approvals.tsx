import { useTranslations } from "use-intl";
import { UserCheck } from "lucide-react";
import { useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import { RequirePerm } from "@/components/states/guards";
import { PageHeader } from "@/components/ui/page-header";
import { PendingTab } from "@/components/approvals/pending-tab";
import { InvitationsTab } from "@/components/approvals/invitations-tab";
import { PreapprovedTab } from "@/components/approvals/preapproved-tab";

const TABS = ["pending", "invitations", "preapproved"] as const;
export type ApprovalsTab = (typeof TABS)[number];

/** /dashboard/approvals — self sign-ups awaiting approval, invitation links, pre-approved list. */
export function Component() {
  const t = useTranslations("approvals");
  usePageTitle(t("title"));
  return (
    <RequirePerm perm="users.approve">
      <ApprovalsPage />
    </RequirePerm>
  );
}

function ApprovalsPage() {
  const t = useTranslations("approvals");
  const tn = useTranslations("nav");
  const sp = useSearchParamsObject();
  const tab: ApprovalsTab = TABS.find((x) => x === sp.tab) ?? "pending";
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} icon={<UserCheck className="size-6" />} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title") }]} />
      {tab === "pending" && <PendingTab sp={sp} />}
      {tab === "invitations" && <InvitationsTab sp={sp} />}
      {tab === "preapproved" && <PreapprovedTab sp={sp} />}
    </>
  );
}

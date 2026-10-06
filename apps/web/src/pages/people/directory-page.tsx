import { useTranslations } from "use-intl";
import type { Permission } from "@onet/shared";
import { usePageTitle } from "@/lib/title";
import { RequirePerm } from "@/components/states/guards";
import { PageHeader } from "@/components/ui/page-header";
import { MemberDirectory } from "@/components/members/member-directory";

const KINDS = {
  members: { type: undefined, perm: "members.read_all" },
  children: { type: "CHILD", perm: "members.read" },
  parents: { type: "PARENT", perm: "members.read_all" },
  monitors: { type: "MONITOR", perm: "members.read_all" },
} as const satisfies Record<string, { type?: string; perm: Permission }>;

/** /dashboard/members | children | parents | monitors */
export function DirectoryPage({ kind }: { kind: keyof typeof KINDS }) {
  const t = useTranslations("people");
  const tn = useTranslations("nav");
  usePageTitle(t(`titles.${kind}`));
  const { type, perm } = KINDS[kind];
  return (
    <RequirePerm perm={perm}>
      <PageHeader title={t(`titles.${kind}`)} description={t(`descriptions.${kind}`)} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t(`titles.${kind}`) }]} />
      <MemberDirectory key={kind} fixedType={type} basePath={`/dashboard/${kind}`} />
    </RequirePerm>
  );
}

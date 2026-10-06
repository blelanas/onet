import { useTranslations } from "use-intl";
import { ClipboardCheck } from "lucide-react";
import type { registrationsPage } from "@api/modules/registrations/routes";
import { can, useMe } from "@/lib/auth";
import { useApi } from "@/lib/query";
import { useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { RequirePerm } from "@/components/states/guards";
import { QueryView } from "@/components/states/page-state";
import { PageHeader } from "@/components/ui/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { FamilyRegistrations } from "@/components/registrations/family-registrations";
import { StaffRegistrations } from "@/components/registrations/staff-registrations";

type Data = Loaded<typeof registrationsPage>;

export function Component() {
  const t = useTranslations("events");
  const tn = useTranslations("nav");
  const me = useMe();
  const staff = can(me, "registrations.manage");
  const title = staff ? t("titles.registrations") : t("titles.myRegistrations");
  usePageTitle(title);
  const sp = useSearchParamsObject();
  const scope = sp.scope === "past" ? "past" : sp.scope === "all" ? "all" : "upcoming";
  const filters = { kind: sp.kind, status: sp.status, target: sp.target, payment: sp.payment, q: sp.q };

  const keep = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]);
  const href = (k: string) => {
    const p = new URLSearchParams(keep);
    if (k !== "upcoming") p.set("scope", k);
    const qs = p.toString();
    return `/dashboard/registrations${qs ? `?${qs}` : ""}`;
  };

  return (
    <RequirePerm any={["registrations.manage", "events.register", "trips.register"]}>
      <PageHeader
        icon={<ClipboardCheck className="size-6" />}
        title={title}
        description={staff ? t("descriptions.registrations") : t("descriptions.myRegistrations")}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: title }]}
      />
      <LinkTabs
        active={scope}
        tabs={[
          { key: "upcoming", label: t("registrations.scope.upcoming"), href: href("upcoming") },
          { key: "past", label: t("registrations.scope.past"), href: href("past") },
          { key: "all", label: t("registrations.scope.all"), href: href("all") },
        ]}
      />
      <Registrations params={{ ...filters, scope: sp.scope, page: sp.page }} sp={sp} />
    </RequirePerm>
  );
}

function Registrations({ params, sp }: { params: Record<string, string | undefined>; sp: Record<string, string | undefined> }) {
  const query = useApi<Data>("/registrations", params);
  return (
    <QueryView query={query}>
      {(data) =>
        data.staff ? (
          <StaffRegistrations rows={data.rows} total={data.total} page={data.page} pageSize={data.pageSize} kpi={data.kpi} targets={data.targets} searchParams={sp} />
        ) : (
          <FamilyRegistrations rows={data.rows} canPay={data.canPay} />
        )
      }
    </QueryView>
  );
}

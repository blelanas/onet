import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ClipboardCheck } from "lucide-react";
import { can, requireUser } from "@/lib/auth/guards";
import { listRegistrations } from "@/server/registrations/queries";
import { PageHeader } from "@/components/ui/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { FamilyRegistrations } from "@/components/registrations/family-registrations";
import { StaffRegistrations } from "@/components/registrations/staff-registrations";

type SP = Record<string, string | string[] | undefined>;

export async function generateMetadata() {
  const t = await getTranslations("events");
  return { title: t("titles.registrations") };
}

export default async function RegistrationsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const staff = can(user, "registrations.manage");
  if (!staff && !can(user, "events.register") && !can(user, "trips.register")) redirect("/dashboard/forbidden");
  const sp = await searchParams;
  const t = await getTranslations("events");
  const tn = await getTranslations("nav");
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const scope = str("scope") === "past" ? "past" : str("scope") === "all" ? "all" : "upcoming";
  const filters = { kind: str("kind"), status: str("status"), target: str("target"), payment: str("payment"), q: str("q"), scope };
  const rows = await listRegistrations(user, filters);

  const keep = new URLSearchParams(Object.entries({ ...filters, scope: undefined }).filter(([, v]) => v) as [string, string][]);
  const href = (k: string) => {
    const p = new URLSearchParams(keep);
    if (k !== "upcoming") p.set("scope", k);
    const qs = p.toString();
    return `/dashboard/registrations${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        icon={<ClipboardCheck className="size-6" />}
        title={staff ? t("titles.registrations") : t("titles.myRegistrations")}
        description={staff ? t("descriptions.registrations") : t("descriptions.myRegistrations")}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: staff ? t("titles.registrations") : t("titles.myRegistrations") }]}
      />
      <LinkTabs
        active={scope}
        tabs={[
          { key: "upcoming", label: t("registrations.scope.upcoming"), href: href("upcoming") },
          { key: "past", label: t("registrations.scope.past"), href: href("past") },
          { key: "all", label: t("registrations.scope.all"), href: href("all") },
        ]}
      />
      {staff ? <StaffRegistrations rows={rows} searchParams={sp} /> : <FamilyRegistrations rows={rows} user={user} />}
    </>
  );
}

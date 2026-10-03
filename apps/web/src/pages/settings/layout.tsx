import { useTranslations } from "use-intl";
import { Settings } from "lucide-react";
import type { settingsNavPage } from "@api/modules/settings/routes";
import { useMe } from "@/lib/auth";
import { useApi } from "@/lib/query";
import { Navigate, Outlet } from "@/lib/router";
import type { Loaded } from "@/lib/types";
import { Forbidden } from "@/components/states/page-state";
import { PageHeader } from "@/components/ui/page-header";
import { allowedSections } from "@/components/settings/sections";
import { SettingsNav } from "@/components/settings/settings-nav";

/** /dashboard/settings/* — header + permission-filtered sub-navigation around the section page. */
export function Component() {
  const me = useMe();
  const t = useTranslations("settings");
  const tn = useTranslations("nav");
  const sections = allowedSections(me.perms);
  const nav = useApi<Loaded<typeof settingsNavPage>>(sections.length ? "/settings/nav" : null);
  if (!sections.length) return <Forbidden />;
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} icon={<Settings className="size-6" />} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title") }]} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        <SettingsNav keys={sections.map((s) => s.key)} badges={nav.data?.badges ?? {}} />
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </>
  );
}

/** /dashboard/settings → first section the user may open. */
export function SettingsIndex() {
  const me = useMe();
  const first = allowedSections(me.perms)[0];
  return first ? <Navigate to={first.href} replace /> : <Forbidden />;
}

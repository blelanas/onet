import { useMemo } from "react";
import { useTranslations } from "use-intl";
import { usePageTitle } from "@/lib/title";
import { RequirePerm } from "@/components/states/guards";
import { PageHeader } from "@/components/ui/page-header";
import { EventForm } from "@/components/events/event-form";

export function Component() {
  const t = useTranslations("events");
  const tn = useTranslations("nav");
  usePageTitle(t("titles.new"));
  const initial = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() + 14);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start.getTime() + 3 * 3600_000);
    return { startAt: start, endAt: end };
  }, []);
  return (
    <RequirePerm perm="events.manage">
      <PageHeader title={t("titles.new")} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("titles.events"), href: "/dashboard/events" }, { label: t("titles.new") }]} />
      <div className="max-w-4xl">
        <EventForm initial={initial} />
      </div>
    </RequirePerm>
  );
}

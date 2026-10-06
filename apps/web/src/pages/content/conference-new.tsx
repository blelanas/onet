import { useTranslations } from "use-intl";
import { usePageTitle } from "@/lib/title";
import { RequirePerm } from "@/components/states/guards";
import { PageHeader } from "@/components/ui/page-header";
import { ConferenceForm } from "@/components/content/conferences/conference-form";

/** Default date of a new conference: in two weeks at 18:00. */
function defaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  d.setHours(18, 0, 0, 0);
  return d;
}

/** /dashboard/content/conferences/new */
export function Component() {
  const t = useTranslations("content.conferences");
  const tn = useTranslations("nav");
  usePageTitle(t("new"));
  return (
    <RequirePerm perm="content.manage">
      <div className="mx-auto max-w-6xl">
        <PageHeader title={t("new")} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title"), href: "/dashboard/content/conferences" }, { label: t("new") }]} />
        <ConferenceForm initial={{ isPublic: true, date: defaultDate() }} />
      </div>
    </RequirePerm>
  );
}

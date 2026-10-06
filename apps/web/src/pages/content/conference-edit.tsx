import { useTranslations } from "use-intl";
import type { conferencePage } from "@api/modules/content/routes";
import { useApi } from "@/lib/query";
import { useParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { RequirePerm } from "@/components/states/guards";
import { QueryView } from "@/components/states/page-state";
import { PageHeader } from "@/components/ui/page-header";
import { ConferenceForm } from "@/components/content/conferences/conference-form";

type Data = Loaded<typeof conferencePage>;

/** /dashboard/content/conferences/:id/edit */
export function Component() {
  const t = useTranslations("content.conferences");
  usePageTitle(t("editTitle"));
  return (
    <RequirePerm perm="content.manage">
      <Edit />
    </RequirePerm>
  );
}

function Edit() {
  const { id } = useParams();
  const t = useTranslations("content.conferences");
  const tn = useTranslations("nav");
  const query = useApi<Data>(`/content/conferences/${id}`);
  return (
    <QueryView query={query}>
      {({ conference }) => (
        <div className="mx-auto max-w-6xl">
          <PageHeader
            title={t("editTitle")}
            description={conference.title}
            breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title"), href: "/dashboard/content/conferences" }, { label: conference.title, href: `/dashboard/content/conferences/${id}` }, { label: t("editTitle") }]}
          />
          <ConferenceForm key={conference.id} initial={conference} />
        </div>
      )}
    </QueryView>
  );
}

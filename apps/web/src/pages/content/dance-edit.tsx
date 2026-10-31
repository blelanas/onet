import { useTranslations } from "use-intl";
import type { danceFormPage } from "@api/modules/content/routes";
import { useApi } from "@/lib/query";
import { useParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { RequirePerm } from "@/components/states/guards";
import { QueryView } from "@/components/states/page-state";
import { PageHeader } from "@/components/ui/page-header";
import { DanceForm } from "@/components/content/dances/dance-form";

type Data = Loaded<typeof danceFormPage>;

/** /dashboard/content/dances/:id/edit */
export function Component() {
  const t = useTranslations("content.dances");
  usePageTitle(t("editTitle"));
  return (
    <RequirePerm perm="content.manage">
      <Edit />
    </RequirePerm>
  );
}

function Edit() {
  const { id } = useParams();
  const t = useTranslations("content.dances");
  const tn = useTranslations("nav");
  const query = useApi<Data>(`/content/dances/${id}/form`);
  return (
    <QueryView query={query}>
      {({ dance }) => (
        <div className="mx-auto max-w-6xl">
          <PageHeader
            title={t("editTitle")}
            description={dance.title}
            breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title"), href: "/dashboard/content/dances" }, { label: dance.title, href: `/dashboard/content/dances/${id}` }, { label: t("editTitle") }]}
          />
          <DanceForm key={dance.id} initial={dance} />
        </div>
      )}
    </QueryView>
  );
}

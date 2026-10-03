import { useTranslations } from "use-intl";
import type { songPage } from "@api/modules/content/routes";
import { useApi } from "@/lib/query";
import { useParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { RequirePerm } from "@/components/states/guards";
import { QueryView } from "@/components/states/page-state";
import { PageHeader } from "@/components/ui/page-header";
import { SongForm } from "@/components/content/songs/song-form";

type Data = Loaded<typeof songPage>;

/** /dashboard/content/songs/:id/edit */
export function Component() {
  const t = useTranslations("content.songs");
  usePageTitle(t("editTitle"));
  return (
    <RequirePerm perm="content.manage">
      <Edit />
    </RequirePerm>
  );
}

function Edit() {
  const { id } = useParams();
  const t = useTranslations("content.songs");
  const tn = useTranslations("nav");
  const query = useApi<Data>(`/content/songs/${id}`);
  return (
    <QueryView query={query}>
      {({ song }) => (
        <div className="mx-auto max-w-6xl">
          <PageHeader
            title={t("editTitle")}
            description={song.title}
            breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title"), href: "/dashboard/content/songs" }, { label: song.title, href: `/dashboard/content/songs/${id}` }, { label: t("editTitle") }]}
          />
          <SongForm key={song.id} initial={song} />
        </div>
      )}
    </QueryView>
  );
}

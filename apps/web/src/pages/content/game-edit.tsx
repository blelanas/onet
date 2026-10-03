import { useTranslations } from "use-intl";
import type { gamePage } from "@api/modules/content/routes";
import { useApi } from "@/lib/query";
import { useParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { RequirePerm } from "@/components/states/guards";
import { QueryView } from "@/components/states/page-state";
import { PageHeader } from "@/components/ui/page-header";
import { GameForm } from "@/components/content/games/game-form";

type Data = Loaded<typeof gamePage>;

/** /dashboard/content/games/:id/edit */
export function Component() {
  const t = useTranslations("content.games");
  usePageTitle(t("editTitle"));
  return (
    <RequirePerm perm="content.manage">
      <Edit />
    </RequirePerm>
  );
}

function Edit() {
  const { id } = useParams();
  const t = useTranslations("content.games");
  const tn = useTranslations("nav");
  const query = useApi<Data>(`/content/games/${id}`);
  return (
    <QueryView query={query}>
      {({ game }) => (
        <div className="mx-auto max-w-6xl">
          <PageHeader
            title={t("editTitle")}
            description={game.name}
            breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title"), href: "/dashboard/content/games" }, { label: game.name, href: `/dashboard/content/games/${id}` }, { label: t("editTitle") }]}
          />
          <GameForm key={game.id} initial={game} />
        </div>
      )}
    </QueryView>
  );
}

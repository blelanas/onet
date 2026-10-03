import { useTranslations } from "use-intl";
import { usePageTitle } from "@/lib/title";
import { RequirePerm } from "@/components/states/guards";
import { PageHeader } from "@/components/ui/page-header";
import { GameForm } from "@/components/content/games/game-form";

/** /dashboard/content/games/new */
export function Component() {
  const t = useTranslations("content.games");
  const tn = useTranslations("nav");
  usePageTitle(t("new"));
  return (
    <RequirePerm perm="content.manage">
      <div className="mx-auto max-w-6xl">
        <PageHeader title={t("new")} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title"), href: "/dashboard/content/games" }, { label: t("new") }]} />
        <GameForm initial={{ isPublic: true }} />
      </div>
    </RequirePerm>
  );
}

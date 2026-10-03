import { getTranslations } from "next-intl/server";
import { pageQuery, requirePagePermission } from "@/lib/auth/guards";
import { getGame } from "@/server/content/games";
import { PageHeader } from "@/components/ui/page-header";
import { GameForm } from "@/components/content/games/game-form";

export async function generateMetadata() {
  const t = await getTranslations("content.games");
  return { title: t("editTitle") };
}

export default async function EditGamePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("content.manage");
  const { id } = await params;
  const game = await pageQuery(getGame(id));
  const t = await getTranslations("content.games");
  const tn = await getTranslations("nav");
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("editTitle")}
        description={game.name}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title"), href: "/dashboard/content/games" }, { label: game.name, href: `/dashboard/content/games/${id}` }, { label: t("editTitle") }]}
      />
      <GameForm initial={game} />
    </div>
  );
}

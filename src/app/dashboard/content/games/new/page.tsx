import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { GameForm } from "@/components/content/games/game-form";

export async function generateMetadata() {
  const t = await getTranslations("content.games");
  return { title: t("new") };
}

export default async function NewGamePage() {
  await requirePagePermission("content.manage");
  const t = await getTranslations("content.games");
  const tn = await getTranslations("nav");
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("new")} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title"), href: "/dashboard/content/games" }, { label: t("new") }]} />
      <GameForm initial={{ isPublic: true }} />
    </div>
  );
}

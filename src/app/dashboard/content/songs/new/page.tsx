import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { SongForm } from "@/components/content/songs/song-form";

export async function generateMetadata() {
  const t = await getTranslations("content.songs");
  return { title: t("new") };
}

export default async function NewSongPage() {
  await requirePagePermission("content.manage");
  const t = await getTranslations("content.songs");
  const tn = await getTranslations("nav");
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("new")} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title"), href: "/dashboard/content/songs" }, { label: t("new") }]} />
      <SongForm initial={{ featured: false, isPublic: true }} />
    </div>
  );
}

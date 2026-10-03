import { getTranslations } from "next-intl/server";
import { pageQuery, requirePagePermission } from "@/lib/auth/guards";
import { getSong } from "@/server/content/songs";
import { PageHeader } from "@/components/ui/page-header";
import { SongForm } from "@/components/content/songs/song-form";

export async function generateMetadata() {
  const t = await getTranslations("content.songs");
  return { title: t("editTitle") };
}

export default async function EditSongPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("content.manage");
  const { id } = await params;
  const song = await pageQuery(getSong(id));
  const t = await getTranslations("content.songs");
  const tn = await getTranslations("nav");
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("editTitle")}
        description={song.title}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title"), href: "/dashboard/content/songs" }, { label: song.title, href: `/dashboard/content/songs/${id}` }, { label: t("editTitle") }]}
      />
      <SongForm initial={song} />
    </div>
  );
}

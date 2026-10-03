import { useTranslations } from "use-intl";
import { usePageTitle } from "@/lib/title";
import { RequirePerm } from "@/components/states/guards";
import { PageHeader } from "@/components/ui/page-header";
import { SongForm } from "@/components/content/songs/song-form";

/** /dashboard/content/songs/new */
export function Component() {
  const t = useTranslations("content.songs");
  const tn = useTranslations("nav");
  usePageTitle(t("new"));
  return (
    <RequirePerm perm="content.manage">
      <div className="mx-auto max-w-6xl">
        <PageHeader title={t("new")} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title"), href: "/dashboard/content/songs" }, { label: t("new") }]} />
        <SongForm initial={{ featured: false, isPublic: true }} />
      </div>
    </RequirePerm>
  );
}
